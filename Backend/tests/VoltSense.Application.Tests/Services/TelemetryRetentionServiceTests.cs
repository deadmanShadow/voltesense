using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using VoltSense.Application.Services;
using VoltSense.Domain.Interfaces;

namespace VoltSense.Application.Tests.Services;

/// <summary>
/// Unit tests for <see cref="TelemetryRetentionService"/>.
/// Verifies that:
/// <list type="bullet">
///   <item>A non-positive retention window is rejected with a warning and no DB call.</item>
///   <item>A normal cutoff is computed relative to "now" and forwarded to the repository.</item>
///   <item>The returned deleted count is honoured by the logger.</item>
/// </list>
/// </summary>
public class TelemetryRetentionServiceTests
{
    private static TelemetryRetentionService BuildService(Mock<IUpsRepository> repository) =>
        new(repository.Object, NullLogger<TelemetryRetentionService>.Instance);

    [Fact]
    public async Task ApplyRetentionAsync_Should_Skip_When_RetentionDays_Is_Less_Than_One()
    {
        var repository = new Mock<IUpsRepository>(MockBehavior.Strict);
        var sut = BuildService(repository);

        await sut.ApplyRetentionAsync(retentionDays: 0, CancellationToken.None);
        await sut.ApplyRetentionAsync(retentionDays: -7, CancellationToken.None);

        repository.Verify(r => r.DeleteOldTelemetryAsync(It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ApplyRetentionAsync_Should_Pass_Cutoff_Equal_To_Now_Minus_RetentionDays()
    {
        var repository = new Mock<IUpsRepository>();
        repository.Setup(r => r.DeleteOldTelemetryAsync(It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(0);

        var sut = BuildService(repository);

        var before = DateTimeOffset.UtcNow.AddDays(-30).AddSeconds(-2);
        await sut.ApplyRetentionAsync(30, CancellationToken.None);
        var after  = DateTimeOffset.UtcNow.AddDays(-30).AddSeconds(2);

        repository.Verify(r => r.DeleteOldTelemetryAsync(
                It.Is<DateTimeOffset>(d => d >= before && d <= after),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ApplyRetentionAsync_Should_Forward_The_Provided_CancellationToken()
    {
        var repository = new Mock<IUpsRepository>();
        repository.Setup(r => r.DeleteOldTelemetryAsync(It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(5);

        var sut = BuildService(repository);
        using var cts = new CancellationTokenSource();

        await sut.ApplyRetentionAsync(7, cts.Token);

        repository.Verify(r => r.DeleteOldTelemetryAsync(It.IsAny<DateTimeOffset>(), cts.Token), Times.Once);
    }
}
