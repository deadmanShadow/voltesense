using VoltSense.Domain.Enums;
using VoltSense.Domain.ValueObjects;

namespace VoltSense.Infrastructure.UPS;

/// <summary>
/// Maps raw HID Power Device Class report bytes into a normalized,
/// immutable <see cref="UpsTelemetry"/>.
/// <para>
/// <b>Contract:</b> every measurement field the device did not report MUST
/// stay <c>null</c>. It is never acceptable to substitute a placeholder
/// value (PRD §13 / §62 rule 13). The frontend is expected to render
/// <c>null</c> as "Unavailable".
/// </para>
/// <para>
/// <b>Implementation note (PRD §57):</b> exact byte offsets are
/// device-specific. The report descriptor of the connected UPS must be
/// inspected first; only fields confirmed present in that descriptor
/// should be parsed. This static implementation returns all-null for now
/// and will be filled in / unit-tested per-device during Phase 11 hardware
/// testing — until then, callers will see "Unavailable" everywhere, which
/// is the correct behaviour for an unverified parser.
/// </para>
/// </summary>
public static class NutStyleTelemetryMapper
{
    /// <summary>
    /// Convert a raw HID input report into a <see cref="UpsTelemetry"/>.
    /// </summary>
    /// <param name="report">Raw bytes read from the HID stream.</param>
    /// <param name="length">Number of valid bytes in <paramref name="report"/>.</param>
    /// <returns>
    /// A snapshot with <see cref="UpsStatus.Unknown"/> and all measurement
    /// fields <c>null</c>. Never throws; never returns fabricated data.
    /// </returns>
    public static UpsTelemetry Map(byte[] report, int length)
    {
        // Defensive: the caller (WindowsHidUpsProvider) already validates
        // length and report, but we re-check here so this method is safe to
        // call from anywhere — including tests.
        if (report is null || length <= 0 || length > report.Length)
        {
            return new UpsTelemetry(
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
        }

        // TODO(PRD §57): once real UPS hardware is connected, parse usage-page 0x84
        // fields out of `report[0..length]` according to the report descriptor of
        // the attached device. Until then: return everything null with Unknown status.
        return new UpsTelemetry(
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
    }
}
