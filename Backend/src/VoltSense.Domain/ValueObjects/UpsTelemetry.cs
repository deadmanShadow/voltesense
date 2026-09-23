using VoltSense.Domain.Enums;

namespace VoltSense.Domain.ValueObjects;

/// <summary>
/// Strictly read-only, immutable snapshot of UPS telemetry at a single point in time.
/// <para>
/// Every field except <see cref="Timestamp"/> and <see cref="Status"/> is nullable:
/// a <c>null</c> means "the connected hardware did not report this measurement",
/// NEVER "we don't know so we made one up" (PRD §13 / §62 rule 13).
/// </para>
/// <para>
/// This is a <c>record</c> so structural equality, <c>with</c>-expressions, and
/// deconstruction all work out of the box — important for time-series caching
/// and unit tests.
/// </para>
/// </summary>
public sealed record UpsTelemetry(
    DateTimeOffset Timestamp,
    decimal? BatteryChargePercent,
    decimal? BatteryVoltage,
    decimal? LoadPercent,
    decimal? InputVoltage,
    decimal? OutputVoltage,
    int? RuntimeSeconds,
    decimal? TemperatureCelsius,
    decimal? FrequencyHz,
    decimal? PowerWatts,
    decimal? ApparentPowerVa,
    UpsStatus Status
);
