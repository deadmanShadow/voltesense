using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using VoltSense.Application.DTOs;
using VoltSense.Application.UseCases.GetTelemetryHistory;
using VoltSense.Domain.Entities;
using VoltSense.Domain.Enums;
using VoltSense.Domain.Interfaces;

namespace VoltSense.Application.Tests.UseCases;

/// <summary>
/// Unit tests for <see cref="GetTelemetryHistoryHandler"/>.
/// Confirms validation runs BEFORE any DB call, and that the returned
/// DTOs preserve the underlying snapshot's null-safety semantics.
/// </summary>
public class GetTelemetryHistoryHandlerTests
{
    [Fact]
    public async Task HandleAsync_Should_Throw_Before_Calling_Repository_When_Query_Is_Invalid()
    {
        var repository = new Mock<IUpsRepository>(MockBehavior.Strict);
        var sut = new GetTelemetryHistoryHandler(repository.Object, NullLogger<GetTelemetryHistoryHandler>.Instance);

        var now = DateTimeOffset.UtcNow;
        var bad = new HistoryQueryDto(now, now); // From == To

        var act = async () => await sut.HandleAsync(Guid.NewGuid(), bad, CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentException>();
        repository.Verify(r => r.GetHistoryAsync(It.IsAny<Guid>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_Should_Return_Dtos_In_Repository_Order()
    {
        var deviceId = Guid.NewGuid();
        var now      = DateTimeOffset.UtcNow;
        var snapshots = new List<TelemetrySnapshot>
        {
            new() { UpsDeviceId = deviceId, Timestamp = now.AddMinutes(-2), Status = UpsStatus.Online,
                    BatteryCharge = 80m, BatteryVoltage = 12.5m, LoadPercentage = 30m },
            new() { UpsDeviceId = deviceId, Timestamp = now.AddMinutes(-1), Status = UpsStatus.OnBattery,
                    BatteryCharge = 78m }
        };
        var repository = new Mock<IUpsRepository>();
        repository.Setup(r => r.GetHistoryAsync(deviceId, It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(snapshots);

        var sut = new GetTelemetryHistoryHandler(repository.Object, NullLogger<GetTelemetryHistoryHandler>.Instance);
        var query = new HistoryQueryDto(now.AddHours(-1), now);

        var dtos = await sut.HandleAsync(deviceId, query, CancellationToken.None);

        dtos.Should().HaveCount(2);
        dtos[0].Status.Should().Be(nameof(UpsStatus.Online));
        dtos[1].Status.Should().Be(nameof(UpsStatus.OnBattery));
        dtos[1].BatteryCharge.Should().Be(78m);
        dtos[1].BatteryVoltage.Should().BeNull(); // null-safety preserved
    }

    [Fact]
    public async Task HandleAsync_Should_Throw_On_Null_Query()
    {
        var repository = new Mock<IUpsRepository>(MockBehavior.Strict);
        var sut = new GetTelemetryHistoryHandler(repository.Object, NullLogger<GetTelemetryHistoryHandler>.Instance);

        var act = async () => await sut.HandleAsync(Guid.NewGuid(), null!, CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentNullException>();
    }
}
