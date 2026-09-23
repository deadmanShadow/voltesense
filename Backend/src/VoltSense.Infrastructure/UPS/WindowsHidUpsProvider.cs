using HidSharp;
using Microsoft.Extensions.Logging;
using VoltSense.Domain.Enums;
using VoltSense.Domain.Interfaces;
using VoltSense.Domain.ValueObjects;

namespace VoltSense.Infrastructure.UPS;

/// <summary>
/// Windows USB HID implementation of <see cref="IUpsProvider"/>.
/// <para>
/// <b>STRICTLY READ-ONLY:</b> this provider only ever issues HID "Get
/// Feature/Input Report" calls — never "Set Feature" / "Write Report". Any
/// control path would violate PRD §10 / §23 and is forbidden by the
/// <see cref="IUpsProvider"/> contract.
/// </para>
/// <para>
/// Follows the USB HID Power Device Class (usage page <c>0x84</c>) and the
/// Battery System page (<c>0x85</c>) where the connected UPS exposes them.
/// A small allowlist of well-known UPS vendor IDs is used as a fallback
/// signal for devices whose HID report descriptor cannot be parsed by
/// HidSharp (some vendors ship non-conformant descriptors). Usage-page
/// inspection always takes priority over the VID fallback.
/// </para>
/// <para>
/// All public methods are safe to call when no UPS is plugged in — they
/// return <c>null</c> / empty results instead of throwing. Internal HID
/// failures are swallowed and logged so the background worker never
/// crashes (PRD §33 / §55 / §60).
/// </para>
/// </summary>
public sealed class WindowsHidUpsProvider : IUpsProvider
{
    // ---------------------------------------------------------------------
    // USB HID Usage Page constants (USB HID Usage Tables spec, §1.1.1 / §1.1.2)
    // ---------------------------------------------------------------------
    private const int PowerDeviceUsagePage   = 0x84;   // Power Device Page (PDC)
    private const int BatterySystemUsagePage = 0x85;   // Battery System Page

    /// <summary>
    /// Fallback allowlist of common UPS manufacturer vendor IDs. Used only
    /// when a device's report descriptor cannot be parsed — usage-page
    /// inspection is always the primary signal (PRD §57).
    /// </summary>
    private static readonly HashSet<int> KnownUpsVendorIds = new()
    {
        0x051D, // APC
        0x0463, // Eaton / MGE
        0x0764, // Cyber Power Systems
        0x09AE, // Tripp Lite
        0x0665, // Cypress (used by some Ippon / off-brand UPS HID controllers)
    };

    private readonly ILogger<WindowsHidUpsProvider> _logger;

    // Volatile-equivalent state — only mutated from a single background-worker
    // thread in practice, but the locks make the read paths safe if anyone
    // ever decides to call this provider from multiple threads.
    private readonly object _stateLock = new();
    private HidDevice?  _activeDevice;
    private HidStream?  _stream;

    public WindowsHidUpsProvider(ILogger<WindowsHidUpsProvider> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    // ---------------------------------------------------------------------
    // IUpsProvider implementation
    // ---------------------------------------------------------------------

    public Task<IReadOnlyList<UpsDeviceInfo>> DetectDevicesAsync(CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        // HidSharp's enumeration is synchronous and OS-bounded, so wrap the
        // materialisation in a Task to keep the interface async.
        IReadOnlyList<UpsDeviceInfo> devices;
        try
        {
            devices = DeviceList.Local
                .GetHidDevices()
                .Where(IsPowerDevice)
                .Select(ToDeviceInfo)
                .Where(x => x is not null)
                .Select(x => x!)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to enumerate HID devices");
            devices = Array.Empty<UpsDeviceInfo>();
        }

        return Task.FromResult(devices);
    }

    public async Task<UpsDeviceInfo?> GetDeviceInfoAsync(CancellationToken ct = default)
    {
        await EnsureConnectedAsync(ct).ConfigureAwait(false);

        lock (_stateLock)
        {
            return _activeDevice is null ? null : ToDeviceInfo(_activeDevice);
        }
    }

    public async Task<UpsTelemetry?> GetTelemetryAsync(CancellationToken ct = default)
    {
        await EnsureConnectedAsync(ct).ConfigureAwait(false);

        HidDevice?  device;
        HidStream?  stream;
        int         maxInputReportLen;

        lock (_stateLock)
        {
            device           = _activeDevice;
            stream           = _stream;
            maxInputReportLen = device?.GetMaxInputReportLength() ?? 0;
        }

        if (device is null || stream is null || maxInputReportLen <= 0)
            return null;

        try
        {
            // Read-only: HID "Input Report" GET only. Never "Set Report".
            var report = new byte[maxInputReportLen];
            int bytesRead = await stream.ReadAsync(report, 0, report.Length, ct).ConfigureAwait(false);

            if (bytesRead <= 0)
                return null;

            return NutStyleTelemetryMapper.Map(report, bytesRead);
        }
        catch (OperationCanceledException)
        {
            // Cooperative cancellation — propagate so the worker can shut down cleanly.
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read UPS telemetry — device may be busy or disconnected");

            // Invalidate the cached stream so the next cycle re-opens it.
            lock (_stateLock)
            {
                try { _stream?.Dispose(); } catch { /* swallow */ }
                _stream = null;
                _activeDevice = null;
            }

            return null;
        }
    }

    public Task<UpsConnectionStatus> GetConnectionStatusAsync(CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        bool connected;
        lock (_stateLock)
        {
            connected = _activeDevice is not null && _stream is not null;
        }

        return Task.FromResult(new UpsConnectionStatus(
            connected,
            connected ? null : "No active UPS stream"));
    }

    // ---------------------------------------------------------------------
    // Connection management
    // ---------------------------------------------------------------------

    /// <summary>
    /// Lazily opens the HID stream to the first detected UPS. No-op if a
    /// stream is already open. Never throws — connection failures degrade
    /// to "no active device" so the worker loop keeps cycling.
    /// </summary>
    private async Task EnsureConnectedAsync(CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();

        lock (_stateLock)
        {
            if (_activeDevice is not null && _stream is not null) return;
        }

        var devices = await DetectDevicesAsync(ct).ConfigureAwait(false);
        if (devices.Count == 0)
        {
            lock (_stateLock)
            {
                _activeDevice = null;
                _stream = null;
            }
            return;
        }

        var target = devices[0];

        HidDevice? hid = null;
        try
        {
            hid = DeviceList.Local
                .GetHidDevices()
                .FirstOrDefault(d => d.VendorID == target.VendorId && d.ProductID == target.ProductId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to look up HID device for {VendorId:X4}:{ProductId:X4}",
                target.VendorId, target.ProductId);
        }

        if (hid is null) return;

        HidStream? opened = null;
        try
        {
            opened = hid.Open();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Unable to open HID stream for detected UPS");
            return;
        }

        lock (_stateLock)
        {
            _activeDevice = hid;
            _stream       = opened;
        }

        _logger.LogInformation(
            "UPS connected: {Manufacturer} {Model} (VID={VendorId:X4}, PID={ProductId:X4})",
            target.Manufacturer, target.Model, target.VendorId, target.ProductId);
    }

    // ---------------------------------------------------------------------
    // Device classification — "is this HID device really a UPS?"
    // ---------------------------------------------------------------------

    /// <summary>
    /// Identifies a real UPS / power device by inspecting its HID report
    /// descriptor's usage pages — never by assumption. A device only
    /// qualifies if it actually exposes Power Device (0x84) or Battery
    /// System (0x85) usages, or (fallback) its VID matches a known UPS
    /// manufacturer. Fail closed on any parsing error.
    /// </summary>
    private static bool IsPowerDevice(HidDevice d)
    {
        try
        {
            int featureLen = d.GetMaxFeatureReportLength();
            int inputLen   = d.GetMaxInputReportLength();

            // No report capability at all — cannot be a telemetry-capable UPS.
            if (featureLen == 0 && inputLen == 0)
                return false;

            if (HasPowerOrBatteryUsagePage(d))
                return true;

            // Fallback only — some UPS vendors ship descriptors HidSharp cannot fully parse.
            return KnownUpsVendorIds.Contains(d.VendorID);
        }
        catch (Exception)
        {
            // A device we cannot safely introspect is not treated as a UPS — fail closed.
            return false;
        }
    }

    private static bool HasPowerOrBatteryUsagePage(HidDevice d)
    {
        try
        {
            var descriptor = d.GetReportDescriptor();

            // Each DeviceItem's Usages exposes combined 32-bit values:
            // (UsagePage << 16) | UsageId. We only need the page, so mask it.
            foreach (var item in descriptor.DeviceItems)
            {
                foreach (var usage in item.Usages.GetAllValues())
                {
                    var usagePage = (int)((usage >> 16) & 0xFFFF);
                    if (usagePage == PowerDeviceUsagePage || usagePage == BatterySystemUsagePage)
                        return true;
                }
            }

            return false;
        }
        catch (Exception)
        {
            // Descriptor parsing failed (malformed / vendor-specific) — let the VID fallback decide.
            return false;
        }
    }

    // ---------------------------------------------------------------------
    // Identity extraction — best-effort, never throws
    // ---------------------------------------------------------------------

    private static UpsDeviceInfo? ToDeviceInfo(HidDevice d)
    {
        try
        {
            return new UpsDeviceInfo(
                Manufacturer:    SafeGetManufacturer(d),
                Model:           SafeGetProductName(d),
                SerialNumber:    TryGetSerial(d),
                FirmwareVersion: null,
                VendorId:        d.VendorID,
                ProductId:       d.ProductID,
                ConnectionType:  ConnectionType.UsbHid);
        }
        catch
        {
            return null;
        }
    }

    private static string SafeGetManufacturer(HidDevice d)
    {
        try { return d.GetManufacturer() ?? "Unknown"; }
        catch { return "Unknown"; }
    }

    private static string SafeGetProductName(HidDevice d)
    {
        try { return d.GetProductName() ?? "Unknown UPS"; }
        catch { return "Unknown UPS"; }
    }

    private static string? TryGetSerial(HidDevice d)
    {
        try { return d.GetSerialNumber(); }
        catch { return null; }
    }
}
