using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using VoltSense.Application.DTOs;
using VoltSense.Application.Interfaces;
using VoltSense.Application.Services;
using VoltSense.Domain.Entities;
using VoltSense.Domain.Enums;
using VoltSense.Domain.Interfaces;
using VoltSense.Domain.ValueObjects;

namespace VoltSense.Application.Tests.Services;

/// <summary>
/// Unit tests for <see cref="UpsMonitoringService"/>.
/// <para>
/// Verifies the four critical branches:
/// <list type="number">
///   <item>Disconnected — early return, no telemetry broadcast.</item>
///   <item>Connected but no device info — skip the cycle gracefully.</item>
///   <item>Connected &amp; telemetry present — upsert, snapshot, broadcast.</item>
///   <item>Status transitions — only broadcast when the status actually changes.</item>
/// </list>
/// </para>
/// </summary>
public class UpsMonitoringServiceTests
{
    private static UpsMonitoringService BuildService(
        Mock<IUpsProvider> provider,
        Mock<IUpsRepository> repository,
        Mock<ITelemetryBroadcaster> broadcaster) =>
        new(provider.Object, repository.Object, broadcaster.Object, NullLogger<UpsMonitoringService>.Instance);

    private static UpsDeviceInfo SampleInfo() =>
        new("APC", "Back-UPS 1500", "AS19", "02.5", 0x051D, 0x0003, ConnectionType.UsbHid);

    private static UpsTelemetry SampleTelemetry(UpsStatus status = UpsStatus.Online) =>
        new(
            Timestamp:            DateTimeOffset.UtcNow,
            BatteryChargePercent: 80m,
            BatteryVoltage:       12.5m,
            LoadPercent:          35m,
            InputVoltage:         230m,
            OutputVoltage:        230m,
            RuntimeSeconds:       1800,
            TemperatureCelsius:   32m,
            FrequencyHz:          50m,
            PowerWatts:           350m,
            ApparentPowerVa:      400m,
            Status:               status);

    // -----------------------------------------------------------------
    // Branch 1: disconnected
    // -----------------------------------------------------------------
    [Fact]
    public async Task RunMonitoringCycleAsync_Should_Return_Early_When_Disconnected_And_Not_Persist_Anything()
    {
        var provider    = new Mock<IUpsProvider>();
        var repository  = new Mock<IUpsRepository>();
        var broadcaster = new Mock<ITelemetryBroadcaster>();

        provider.Setup(p => p.GetConnectionStatusAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(new UpsConnectionStatus(false, "No UPS"));

        var sut = BuildService(provider, repository, broadcaster);

        await sut.RunMonitoringCycleAsync(CancellationToken.None);

        // First call sets baseline — no broadcast expected.
        broadcaster.Verify(b => b.BroadcastConnectionChangedAsync(It.IsAny<bool>(), It.IsAny<CancellationToken>()),
            Times.Never);

        // No upsert / no telemetry broadcast.
        repository.Verify(r => r.AddOrUpdateDeviceAsync(It.IsAny<UpsDevice>(), It.IsAny<CancellationToken>()),
            Times.Never);
        repository.Verify(r => r.AddTelemetrySnapshotAsync(It.IsAny<TelemetrySnapshot>(), It.IsAny<CancellationToken>()),
            Times.Never);
        broadcaster.Verify(b => b.BroadcastTelemetryUpdatedAsync(It.IsAny<TelemetryDto>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task RunMonitoringCycleAsync_Should_Broadcast_Disconnected_When_State_Flips_From_Connected()
    {
        // Cycle 1: connected (transitions default-false baseline → true).
        // Cycle 2: disconnected → must broadcast.
        var provider    = new Mock<IUpsProvider>();
        var repository  = new Mock<IUpsRepository>();
        var broadcaster = new Mock<ITelemetryBroadcaster>();

        bool isConnected = true;
        provider.Setup(p => p.GetConnectionStatusAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(() => new UpsConnectionStatus(isConnected, null));

        var sut = BuildService(provider, repository, broadcaster);

        await sut.RunMonitoringCycleAsync(CancellationToken.None); // connected
        isConnected = false;
        await sut.RunMonitoringCycleAsync(CancellationToken.None); // disconnected

        broadcaster.Verify(b => b.BroadcastConnectionChangedAsync(true,  It.IsAny<CancellationToken>()), Times.Once);
        broadcaster.Verify(b => b.BroadcastConnectionChangedAsync(false, It.IsAny<CancellationToken>()), Times.Once);
    }

    // -----------------------------------------------------------------
    // Branch 2: connected but no device info
    // -----------------------------------------------------------------
    [Fact]
    public async Task RunMonitoringCycleAsync_Should_Return_Quietly_When_Connected_But_DeviceInfo_Is_Null()
    {
        var provider    = new Mock<IUpsProvider>();
        var repository  = new Mock<IUpsRepository>();
        var broadcaster = new Mock<ITelemetryBroadcaster>();

        provider.Setup(p => p.GetConnectionStatusAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(new UpsConnectionStatus(true, null));
        provider.Setup(p => p.GetDeviceInfoAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync((UpsDeviceInfo?)null);

        var sut = BuildService(provider, repository, broadcaster);

        await sut.RunMonitoringCycleAsync(CancellationToken.None);

        broadcaster.Verify(b => b.BroadcastConnectionChangedAsync(true, It.IsAny<CancellationToken>()),
            Times.Once);
        repository.Verify(r => r.AddOrUpdateDeviceAsync(It.IsAny<UpsDevice>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    // -----------------------------------------------------------------
    // Branch 3: full happy path
    // -----------------------------------------------------------------
    [Fact]
    public async Task RunMonitoringCycleAsync_Should_Persist_And_Broadcast_When_Fully_Connected()
    {
        var provider    = new Mock<IUpsProvider>();
        var repository  = new Mock<IUpsRepository>();
        var broadcaster = new Mock<ITelemetryBroadcaster>();

        var info       = SampleInfo();
        var telemetry  = SampleTelemetry(UpsStatus.Online);
        var activeRow  = new UpsDevice(); // Id auto-generated

        provider.Setup(p => p.GetConnectionStatusAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(new UpsConnectionStatus(true, null));
        provider.Setup(p => p.GetDeviceInfoAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(info);
        provider.Setup(p => p.GetTelemetryAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(telemetry);
        repository.Setup(r => r.GetActiveDeviceAsync(It.IsAny<CancellationToken>()))
                  .ReturnsAsync(activeRow);

        var sut = BuildService(provider, repository, broadcaster);

        await sut.RunMonitoringCycleAsync(CancellationToken.None);

        repository.Verify(r => r.AddOrUpdateDeviceAsync(
                It.Is<UpsDevice>(d =>
                    d.Manufacturer == info.Manufacturer &&
                    d.Model        == info.Model        &&
                    d.SerialNumber == info.SerialNumber &&
                    d.VendorId     == info.VendorId     &&
                    d.ProductId    == info.ProductId),
                It.IsAny<CancellationToken>()),
            Times.Once);

        repository.Verify(r => r.AddTelemetrySnapshotAsync(
                It.Is<TelemetrySnapshot>(s =>
                    s.UpsDeviceId    == activeRow.Id &&
                    s.BatteryCharge  == telemetry.BatteryChargePercent &&
                    s.Status         == telemetry.Status),
                It.IsAny<CancellationToken>()),
            Times.Once);

        broadcaster.Verify(b => b.BroadcastTelemetryUpdatedAsync(
                It.Is<TelemetryDto>(dto =>
                    dto.BatteryCharge == telemetry.BatteryChargePercent &&
                    dto.Status        == telemetry.Status.ToString()),
                It.IsAny<CancellationToken>()),
            Times.Once);

        // First status change (Unknown → Online) must also fire.
        broadcaster.Verify(b => b.BroadcastStatusChangedAsync(
                "Online",
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    // -----------------------------------------------------------------
    // Branch 4: status transition dedup
    // -----------------------------------------------------------------
    [Fact]
    public async Task RunMonitoringCycleAsync_Should_Only_Broadcast_StatusChanged_On_Transitions()
    {
        var provider    = new Mock<IUpsProvider>();
        var repository  = new Mock<IUpsRepository>();
        var broadcaster = new Mock<ITelemetryBroadcaster>();

        provider.Setup(p => p.GetConnectionStatusAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(new UpsConnectionStatus(true, null));
        provider.Setup(p => p.GetDeviceInfoAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(SampleInfo());
        provider.Setup(p => p.GetTelemetryAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(SampleTelemetry(UpsStatus.Online));
        repository.Setup(r => r.GetActiveDeviceAsync(It.IsAny<CancellationToken>()))
                  .ReturnsAsync(new UpsDevice());

        var sut = BuildService(provider, repository, broadcaster);

        await sut.RunMonitoringCycleAsync(CancellationToken.None);
        await sut.RunMonitoringCycleAsync(CancellationToken.None);

        // Two telemetry broadcasts, but status changed only ONCE
        // (Unknown → Online). The second cycle's status == Online, so
        // no second status-changed event is sent.
        broadcaster.Verify(b => b.BroadcastTelemetryUpdatedAsync(
                It.IsAny<TelemetryDto>(),
                It.IsAny<CancellationToken>()),
            Times.Exactly(2));

        broadcaster.Verify(b => b.BroadcastStatusChangedAsync(
                "Online",
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    // -----------------------------------------------------------------
    // Cancellation safety: a cancelled token breaks the loop cleanly.
    // -----------------------------------------------------------------
    [Fact]
    public async Task RunMonitoringCycleAsync_Should_Propagate_Cancellation_When_Provider_Throws_OperationCanceled_With_Cancelled_Token()
    {
        var provider    = new Mock<IUpsProvider>();
        var repository  = new Mock<IUpsRepository>();
        var broadcaster = new Mock<ITelemetryBroadcaster>();

        using var cts = new CancellationTokenSource();
        cts.Cancel();

        // Provider throws OperationCanceledException because the
        // cancelled token was forwarded; service MUST re-throw so the
        // background worker can exit cleanly.
        provider.Setup(p => p.GetConnectionStatusAsync(It.IsAny<CancellationToken>()))
                .ThrowsAsync(new OperationCanceledException(cts.Token));

        var sut = BuildService(provider, repository, broadcaster);

        var act = async () => await sut.RunMonitoringCycleAsync(cts.Token);

        await act.Should().ThrowAsync<OperationCanceledException>();
        broadcaster.Verify(b => b.BroadcastConnectionChangedAsync(It.IsAny<bool>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
