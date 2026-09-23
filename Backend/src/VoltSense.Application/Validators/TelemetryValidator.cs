using VoltSense.Application.DTOs;
using VoltSense.Domain.ValueObjects;

namespace VoltSense.Application.Validators;

/// <summary>
/// Pure-function validation helpers for telemetry-related inputs. Returns
/// <c>void</c> on success and throws <see cref="ArgumentException"/> on
/// failure — consistent with .NET's standard input-validation idiom.
/// <para>
/// Validation rules:
/// <list type="bullet">
///   <item><see cref="ValidateHistoryQuery"/> — From &lt; To, window ≤ MaxWindowDays.</item>
///   <item><see cref="ValidateTelemetry"/> — no fabricated data, all measurements either null or in a sane range.</item>
/// </list>
/// </para>
/// </summary>
public static class TelemetryValidator
{
    /// <summary>
    /// Throws if <paramref name="query"/> has From &gt;= To or a window
    /// wider than <see cref="HistoryQueryDto.MaxWindowDays"/> days.
    /// </summary>
    public static void ValidateHistoryQuery(HistoryQueryDto query)
    {
        ArgumentNullException.ThrowIfNull(query);

        if (query.From >= query.To)
        {
            throw new ArgumentException(
                $"History query 'From' ({query.From:o}) must be strictly before 'To' ({query.To:o}).",
                nameof(query));
        }

        var window = query.To - query.From;
        if (window.TotalDays > HistoryQueryDto.MaxWindowDays)
        {
            throw new ArgumentException(
                $"History query window ({window.TotalDays:F1} days) exceeds the maximum allowed " +
                $"({HistoryQueryDto.MaxWindowDays} days). Narrow the range and retry.",
                nameof(query));
        }
    }

    /// <summary>
    /// Sanity-checks a <see cref="UpsTelemetry"/> snapshot. The contract is
    /// "never fabricate": every measurement field is nullable, and a
    /// non-null value must fall within a hardware-plausible range. This
    /// validator catches obvious corruption (e.g. 250% battery charge)
    /// before it ever reaches the database or the frontend.
    /// </summary>
    /// <remarks>
    /// Ranges here are intentionally generous — VoltSense supports many
    /// different UPS models, and an unusual-but-legal reading (e.g. 110%
    /// load on a heavily overloaded unit) must NOT be rejected.
    /// </remarks>
    public static void ValidateTelemetry(UpsTelemetry telemetry)
    {
        ArgumentNullException.ThrowIfNull(telemetry);

        if (telemetry.BatteryChargePercent is { } charge &&
            (charge < 0m || charge > 110m))
        {
            throw new ArgumentException(
                $"Battery charge {charge}% is outside the [0, 110] hardware-plausible range.",
                nameof(telemetry));
        }

        if (telemetry.LoadPercent is { } load &&
            (load < 0m || load > 250m))
        {
            throw new ArgumentException(
                $"Load percentage {load}% is outside the [0, 250] hardware-plausible range.",
                nameof(telemetry));
        }

        if (telemetry.RuntimeSeconds is < 0)
        {
            throw new ArgumentException(
                $"Runtime seconds ({telemetry.RuntimeSeconds.Value}) must be non-negative.",
                nameof(telemetry));
        }

        if (telemetry.TemperatureCelsius is { } temp &&
            (temp < -40m || temp > 150m))
        {
            throw new ArgumentException(
                $"Temperature {temp}°C is outside the [-40, 150] hardware-plausible range.",
                nameof(telemetry));
        }

        if (telemetry.FrequencyHz is { } freq &&
            (freq < 0m || freq > 100m))
        {
            throw new ArgumentException(
                $"Frequency {freq}Hz is outside the [0, 100] hardware-plausible range.",
                nameof(telemetry));
        }
    }
}
