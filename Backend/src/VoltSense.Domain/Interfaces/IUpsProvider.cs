using VoltSense.Domain.ValueObjects;

namespace VoltSense.Domain.Interfaces;

/// <summary>
/// The single abstraction the rest of the application talks to.
/// Only the concrete provider (e.g. <c>WindowsHidUpsProvider</c>) knows about
/// real hardware. Everything above this interface is hardware-agnostic and
/// can be unit-tested with a mock.
/// <para>
/// <b>STRICTLY READ-ONLY.</b> This interface MUST NEVER expose any write or
/// control operation such as <c>Shutdown()</c>, <c>Restart()</c>,
/// <c>RunSelfTest()</c> or <c>SetConfiguration()</c>. VoltSense is a
/// monitoring tool, not a power-management tool (PRD §10 / §23 / §62 rule 7).
/// </para>
/// </summary>
public interface IUpsProvider
{
    /// <summary>
    /// Enumerate every UPS-like device currently visible to the OS, regardless
    /// of whether we have an open HID stream to it.
    /// </summary>
    Task<IReadOnlyList<UpsDeviceInfo>> DetectDevicesAsync(CancellationToken ct = default);

    /// <summary>
    /// Return the identity card for the device we have an open stream to,
    /// or <c>null</c> if no UPS is currently connected.
    /// </summary>
    Task<UpsDeviceInfo?> GetDeviceInfoAsync(CancellationToken ct = default);

    /// <summary>
    /// Read a single telemetry snapshot from the connected UPS.
    /// Returns <c>null</c> if no UPS is connected or the read failed — never throws.
    /// </summary>
    Task<UpsTelemetry?> GetTelemetryAsync(CancellationToken ct = default);

    /// <summary>
    /// Cheap probe used by the monitoring worker to decide whether the rest
    /// of the cycle should run. Implementations should never throw.
    /// </summary>
    Task<UpsConnectionStatus> GetConnectionStatusAsync(CancellationToken ct = default);
}
