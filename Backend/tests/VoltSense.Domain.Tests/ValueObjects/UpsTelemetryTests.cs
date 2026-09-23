using FluentAssertions;
using VoltSense.Domain.Enums;
using VoltSense.Domain.ValueObjects;

namespace VoltSense.Domain.Tests.ValueObjects;

/// <summary>
/// Unit tests for the <see cref="UpsTelemetry"/> immutable value
/// object. The PRD §13 rule "never fabricate" is enforced here:
/// the value object must be constructible with all-null measurement
/// fields, and it must round-trip through the record's value
/// equality.
/// </summary>
public class UpsTelemetryTests
{
    [Fact]
    public void UpsTelemetry_Should_Support_All_Null_Measurements_As_Unknown_State()
    {
        var snapshot = new UpsTelemetry(
            Timestamp:            DateTimeOffset.UtcNow,
            BatteryChargePercent: null,
            BatteryVoltage:       null,
            LoadPercent:          null,
            InputVoltage:         null,
            OutputVoltage:        null,
            RuntimeSeconds:       null,
            TemperatureCelsius:   null,
            FrequencyHz:          null,
            PowerWatts:           null,
            ApparentPowerVa:      null,
            Status:               UpsStatus.Unknown);

        snapshot.BatteryChargePercent.Should().BeNull();
        snapshot.BatteryVoltage.Should().BeNull();
        snapshot.LoadPercent.Should().BeNull();
        snapshot.InputVoltage.Should().BeNull();
        snapshot.OutputVoltage.Should().BeNull();
        snapshot.RuntimeSeconds.Should().BeNull();
        snapshot.TemperatureCelsius.Should().BeNull();
        snapshot.FrequencyHz.Should().BeNull();
        snapshot.PowerWatts.Should().BeNull();
        snapshot.ApparentPowerVa.Should().BeNull();
        snapshot.Status.Should().Be(UpsStatus.Unknown);
    }

    [Fact]
    public void UpsTelemetry_Should_Be_Immutable_Record_With_Value_Equality()
    {
        var ts = DateTimeOffset.UtcNow;
        var a  = new UpsTelemetry(ts, 80m, 12.5m, 35m, 230m, 230m, 1800, 32m, 50m, 350m, 400m, UpsStatus.Online);
        var b  = new UpsTelemetry(ts, 80m, 12.5m, 35m, 230m, 230m, 1800, 32m, 50m, 350m, 400m, UpsStatus.Online);

        a.Should().Be(b);
    }

    [Theory]
    [InlineData(UpsStatus.Unknown,      0)]
    [InlineData(UpsStatus.Online,       1)]
    [InlineData(UpsStatus.OnBattery,    2)]
    [InlineData(UpsStatus.LowBattery,   3)]
    [InlineData(UpsStatus.Charging,     4)]
    [InlineData(UpsStatus.Discharging,  5)]
    [InlineData(UpsStatus.Disconnected, 6)]
    public void UpsStatus_Enum_Should_Keep_Stable_Numeric_Values(UpsStatus status, int expected)
    {
        ((int)status).Should().Be(expected);
    }

    [Fact]
    public void ConnectionType_Enum_Should_Include_UsbHid_Default()
    {
        ((int)ConnectionType.UsbHid).Should().Be(0);
        Enum.IsDefined(typeof(ConnectionType), ConnectionType.UsbHid).Should().BeTrue();
    }
}
