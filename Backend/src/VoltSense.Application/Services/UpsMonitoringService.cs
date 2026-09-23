using Microsoft.Extensions.Logging;
using VoltSense.Application.DTOs;
using VoltSense.Application.Interfaces;
using VoltSense.Domain.Entities;
using VoltSense.Domain.Enums;
using VoltSense.Domain.Interfaces;
using VoltSense.Domain.ValueObjects;

namespace VoltSense.Application.Services;

/// <summary>
/// Default implementation of <see cref="IUpsMonitoringService"/>. Each
/// invocation runs one full monitoring pass:
/// <list type="number">
///   <item>Probe the hardware connection state.</item>
///   <item>Broadcast a connection lifecycle event if state changed.</item>
///   <item>Upsert the device row in the database.</item>
///   <item>Sample telemetry from the device.</item>
///   <item>Persist the snapshot.</item>
///   <item>Broadcast status &amp; telemetry updates if they changed.</item>
/// </list>
/// <para>
/// The service is intentionally <b>stateless across cycles</b>: only the
/// last-known connection and status flags are kept in-memory, and only
/// for change-detection purposes. A service instance is registered as a
/// scoped dependency (one per request / cycle) by the host.
/// </para>
/// <para>
/// All exceptions from the underlying hardware / persistence are caught
/// and logged; the cycle returns normally. The background worker is
/// therefore crash-resistant by design (PRD §33 / §55 / §60).
/// </para>
/// </summary>
public sealed class UpsMonitoringService : IUpsMonitoringService
{
    private readonly IUpsProvider _provider;
    private readonly IUpsRepository _repository;
    private readonly ITelemetryBroadcaster _broadcaster;
    private readonly ILogger<UpsMonitoringService> _logger;

    // Change-detection flags. Reset every cycle is acceptable — they only
    // suppress redundant broadcasts.
    private bool _lastKnownConnected;
    private UpsStatus _lastKnownStatus = UpsStatus.Unknown;

    public UpsMonitoringService(
        IUpsProvider provider,
        IUpsRepository repository,
        ITelemetryBroadcaster broadcaster,
        ILogger<UpsMonitoringService> logger)
    {
        _provider = provider ?? throw new ArgumentNullException(nameof(provider));
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _broadcaster = broadcaster ?? throw new ArgumentNullException(nameof(broadcaster));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task RunMonitoringCycleAsync(CancellationToken ct)
    {
        // 1. Probe the connection.
        UpsConnectionStatus connectionStatus;
        try
        {
            connectionStatus = await _provider.GetConnectionStatusAsync(ct).ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw; // cooperative shutdown — let the worker observe it
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Connection probe failed; skipping cycle");
            return;
        }

        // 2. Broadcast connection-change event only on transitions.
        if (connectionStatus.IsConnected != _lastKnownConnected)
        {
            _lastKnownConnected = connectionStatus.IsConnected;
            try
            {
                await _broadcaster
                    .BroadcastConnectionChangedAsync(connectionStatus.IsConnected, ct)
                    .ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to broadcast connection change");
            }
        }

        // 3. No UPS — nothing else to do; keep scanning next cycle.
        if (!connectionStatus.IsConnected)
        {
            // Reset status baseline so a reconnect re-broadcasts.
            if (_lastKnownStatus != UpsStatus.Unknown)
            {
                _lastKnownStatus = UpsStatus.Unknown;
            }
            return;
        }

        // 4. Fetch identity of the connected device.
        UpsDeviceInfo? deviceInfo;
        try
        {
            deviceInfo = await _provider.GetDeviceInfoAsync(ct).ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Device-info read failed; skipping cycle");
            return;
        }

        if (deviceInfo is null)
        {
            _logger.LogDebug("Device info was null despite an open connection; skipping cycle");
            return;
        }

        // 5. Upsert the device row.
        try
        {
            var upsert = new UpsDevice
            {
                Manufacturer = deviceInfo.Manufacturer,
                Model = deviceInfo.Model,
                SerialNumber = deviceInfo.SerialNumber,
                VendorId = deviceInfo.VendorId,
                ProductId = deviceInfo.ProductId,
                ConnectionType = deviceInfo.ConnectionType,
                FirmwareVersion = deviceInfo.FirmwareVersion
            };
            await _repository.AddOrUpdateDeviceAsync(upsert, ct).ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Device upsert failed; skipping cycle");
            return;
        }

        UpsDevice? activeDevice;
        try
        {
            activeDevice = await _repository.GetActiveDeviceAsync(ct).ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Active-device lookup failed; skipping cycle");
            return;
        }

        if (activeDevice is null)
        {
            _logger.LogWarning("Active device not found after upsert — database consistency issue");
            return;
        }

        // 6. Sample telemetry.
        UpsTelemetry? telemetry;
        try
        {
            telemetry = await _provider.GetTelemetryAsync(ct).ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Telemetry read failed; skipping snapshot");
            return;
        }

        if (telemetry is null)
        {
            _logger.LogDebug("Telemetry sample returned null; nothing to persist");
            return;
        }

        // 7. Persist snapshot.
        var snapshot = new TelemetrySnapshot
        {
            UpsDeviceId = activeDevice.Id,
            Timestamp = telemetry.Timestamp,
            BatteryCharge = telemetry.BatteryChargePercent,
            BatteryVoltage = telemetry.BatteryVoltage,
            LoadPercentage = telemetry.LoadPercent,
            InputVoltage = telemetry.InputVoltage,
            OutputVoltage = telemetry.OutputVoltage,
            RuntimeSeconds = telemetry.RuntimeSeconds,
            Temperature = telemetry.TemperatureCelsius,
            Frequency = telemetry.FrequencyHz,
            Power = telemetry.PowerWatts,
            Status = telemetry.Status
        };

        try
        {
            await _repository.AddTelemetrySnapshotAsync(snapshot, ct).ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Telemetry persistence failed; skipping broadcast");
            return;
        }

        // 8. Broadcast status-change (only on transition).
        if (telemetry.Status != _lastKnownStatus)
        {
            _lastKnownStatus = telemetry.Status;
            try
            {
                await _broadcaster
                    .BroadcastStatusChangedAsync(telemetry.Status.ToString(), ct)
                    .ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to broadcast status change");
            }
        }

        // 9. Broadcast telemetry update (every successful read — the value
        //    almost certainly changed in some field, and the frontend
        //    de-duplicates by timestamp).
        try
        {
            await _broadcaster
                .BroadcastTelemetryUpdatedAsync(MapToDto(snapshot), ct)
                .ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to broadcast telemetry update");
        }
    }

    private static TelemetryDto MapToDto(TelemetrySnapshot s) => new(
        Timestamp:        s.Timestamp,
        BatteryCharge:    s.BatteryCharge,
        BatteryVoltage:   s.BatteryVoltage,
        LoadPercentage:   s.LoadPercentage,
        InputVoltage:     s.InputVoltage,
        OutputVoltage:    s.OutputVoltage,
        RuntimeSeconds:   s.RuntimeSeconds,
        Temperature:      s.Temperature,
        Frequency:        s.Frequency,
        Power:            s.Power,
        Status:           s.Status.ToString());
}
