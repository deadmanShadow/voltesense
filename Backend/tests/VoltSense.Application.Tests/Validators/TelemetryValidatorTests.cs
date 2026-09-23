using FluentAssertions;
using VoltSense.Application.DTOs;
using VoltSense.Application.Validators;
using VoltSense.Domain.Enums;
using VoltSense.Domain.ValueObjects;

namespace VoltSense.Application.Tests.Validators;

/// <summary>
/// Unit tests for <see cref="TelemetryValidator"/>.
/// Confirms PRD §13 ("never fabricate") is enforced: validator never
/// silently substitutes a placeholder value, it either accepts the
/// measurement as-is or throws.
/// </summary>
public class TelemetryValidatorTests
{
    // -----------------------------------------------------------------
    // HistoryQueryDto validation
    // -----------------------------------------------------------------
    [Fact]
    public void ValidateHistoryQuery_Should_Throw_When_From_Equals_To()
    {
        var t   = DateTimeOffset.UtcNow;
        var q   = new HistoryQueryDto(t, t);
        var act = () => TelemetryValidator.ValidateHistoryQuery(q);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void ValidateHistoryQuery_Should_Throw_When_From_Greater_Than_To()
    {
        var t   = DateTimeOffset.UtcNow;
        var q   = new HistoryQueryDto(t.AddDays(1), t);
        var act = () => TelemetryValidator.ValidateHistoryQuery(q);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void ValidateHistoryQuery_Should_Throw_When_Window_Exceeds_MaxWindowDays()
    {
        var now = DateTimeOffset.UtcNow;
        var q   = new HistoryQueryDto(now.AddDays(-HistoryQueryDto.MaxWindowDays - 1), now);
        var act = () => TelemetryValidator.ValidateHistoryQuery(q);

        act.Should().Throw<ArgumentException>()
           .WithMessage("*exceeds the maximum*");
    }

    [Fact]
    public void ValidateHistoryQuery_Should_Accept_One_Hour_Window()
    {
        var now = DateTimeOffset.UtcNow;
        var q   = new HistoryQueryDto(now.AddHours(-1), now);

        var act = () => TelemetryValidator.ValidateHistoryQuery(q);

        act.Should().NotThrow();
    }

    [Fact]
    public void ValidateHistoryQuery_Should_Throw_On_Null_Query()
    {
        var act = () => TelemetryValidator.ValidateHistoryQuery(null!);
        act.Should().Throw<ArgumentNullException>();
    }

    // -----------------------------------------------------------------
    // UpsTelemetry validation — null-safety & plausible-range checks
    // -----------------------------------------------------------------
    [Fact]
    public void ValidateTelemetry_Should_Accept_All_Null_Measurements()
    {
        var t = new UpsTelemetry(
            Timestamp: DateTimeOffset.UtcNow,
            BatteryChargePercent: null, BatteryVoltage: null, LoadPercent: null,
            InputVoltage: null, OutputVoltage: null, RuntimeSeconds: null,
            TemperatureCelsius: null, FrequencyHz: null, PowerWatts: null,
            ApparentPowerVa: null, Status: UpsStatus.Unknown);

        var act = () => TelemetryValidator.ValidateTelemetry(t);

        act.Should().NotThrow();
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(150)]
    public void ValidateTelemetry_Should_Throw_On_Implausible_Battery_Charge(int percent)
    {
        var t = new UpsTelemetry(
            Timestamp: DateTimeOffset.UtcNow, BatteryChargePercent: percent,
            BatteryVoltage: null, LoadPercent: null, InputVoltage: null,
            OutputVoltage: null, RuntimeSeconds: null, TemperatureCelsius: null,
            FrequencyHz: null, PowerWatts: null, ApparentPowerVa: null,
            Status: UpsStatus.Online);

        var act = () => TelemetryValidator.ValidateTelemetry(t);

        act.Should().Throw<ArgumentException>()
           .WithMessage("*Battery charge*");
    }

    [Fact]
    public void ValidateTelemetry_Should_Throw_On_Negative_Runtime_Seconds()
    {
        var t = new UpsTelemetry(
            Timestamp: DateTimeOffset.UtcNow, BatteryChargePercent: 50m,
            BatteryVoltage: null, LoadPercent: null, InputVoltage: null,
            OutputVoltage: null, RuntimeSeconds: -10, TemperatureCelsius: null,
            FrequencyHz: null, PowerWatts: null, ApparentPowerVa: null,
            Status: UpsStatus.OnBattery);

        var act = () => TelemetryValidator.ValidateTelemetry(t);

        act.Should().Throw<ArgumentException>()
           .WithMessage("*Runtime seconds*");
    }

    [Fact]
    public void ValidateTelemetry_Should_Throw_On_Implausible_Temperature()
    {
        var t = new UpsTelemetry(
            Timestamp: DateTimeOffset.UtcNow, BatteryChargePercent: 50m,
            BatteryVoltage: null, LoadPercent: null, InputVoltage: null,
            OutputVoltage: null, RuntimeSeconds: null,
            TemperatureCelsius: 999m, FrequencyHz: null, PowerWatts: null,
            ApparentPowerVa: null, Status: UpsStatus.Online);

        var act = () => TelemetryValidator.ValidateTelemetry(t);

        act.Should().Throw<ArgumentException>()
           .WithMessage("*Temperature*");
    }

    [Fact]
    public void ValidateTelemetry_Should_Throw_On_Null_Telemetry()
    {
        var act = () => TelemetryValidator.ValidateTelemetry(null!);
        act.Should().Throw<ArgumentNullException>();
    }
}
