using FluentAssertions;
using VoltSense.Domain.Enums;
using VoltSense.Infrastructure.UPS;

namespace VoltSense.Infrastructure.Tests.UPS;

/// <summary>
/// Unit tests for <see cref="NutStyleTelemetryMapper"/>.
/// The mapper is intentionally a stub until per-device HID
/// descriptors are wired up — but the no-fabricate contract
/// (PRD §13 / §62 rule 13) MUST hold regardless of input.
/// </summary>
public class NutStyleTelemetryMapperTests
{
    [Fact]
    public void Map_Should_Return_All_Null_Fields_For_Any_NonEmpty_Report()
    {
        var report = new byte[] { 0x84, 0x01, 0x00, 0x00, 0xFF, 0xAB };
        var t = NutStyleTelemetryMapper.Map(report, report.Length);

        t.BatteryChargePercent.Should().BeNull();
        t.BatteryVoltage.Should().BeNull();
        t.LoadPercent.Should().BeNull();
        t.InputVoltage.Should().BeNull();
        t.OutputVoltage.Should().BeNull();
        t.RuntimeSeconds.Should().BeNull();
        t.TemperatureCelsius.Should().BeNull();
        t.FrequencyHz.Should().BeNull();
        t.PowerWatts.Should().BeNull();
        t.ApparentPowerVa.Should().BeNull();
        t.Status.Should().Be(UpsStatus.Unknown);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Map_Should_Return_All_Null_Fields_When_Length_Is_NonPositive(int length)
    {
        var report = new byte[] { 0x01, 0x02, 0x03 };
        var t = NutStyleTelemetryMapper.Map(report, length);

        t.BatteryChargePercent.Should().BeNull();
        t.Status.Should().Be(UpsStatus.Unknown);
    }

    [Fact]
    public void Map_Should_Not_Throw_On_Empty_Report()
    {
        var report = Array.Empty<byte>();
        var act = () => NutStyleTelemetryMapper.Map(report, 0);

        act.Should().NotThrow();
    }

    [Fact]
    public void Map_Should_Not_Throw_On_Null_Report()
    {
        var act = () => NutStyleTelemetryMapper.Map(null!, 10);

        act.Should().NotThrow();
    }

    [Fact]
    public void Map_Should_Not_Throw_When_Length_Exceeds_Report_Length()
    {
        var report = new byte[] { 0x01, 0x02 };
        var act = () => NutStyleTelemetryMapper.Map(report, 999);

        act.Should().NotThrow();
    }

    [Fact]
    public void Map_Should_Always_Use_UtcNow_As_Timestamp()
    {
        var before = DateTimeOffset.UtcNow.AddMilliseconds(-50);
        var t = NutStyleTelemetryMapper.Map(new byte[] { 0x00 }, 1);
        var after  = DateTimeOffset.UtcNow.AddMilliseconds(50);

        t.Timestamp.Should().BeOnOrAfter(before).And.BeOnOrBefore(after);
    }
}
