using VoltSense.Domain.Enums;

namespace VoltSense.Domain.Entities;

/// <summary>
/// One row in the high-write time-series table <c>telemetry_snapshots</c>.
/// Captures a single <c>UpsTelemetry</c> reading in a denormalised form
/// so historical queries never need to JOIN value-object tables.
/// <para>
/// All measurement columns are nullable: a <c>null</c> means the device
/// did not report that measurement at this instant. Never fabricated.
/// </para>
/// </summary>
public class TelemetrySnapshot
{
    /// <summary>Database-assigned bigint identity. Populated by the database.</summary>
    public long Id { get; private set; }

    public Guid UpsDeviceId { get; set; }
    public UpsDevice? UpsDevice { get; set; }

    /// <summary>UTC instant the reading was taken.</summary>
    public DateTimeOffset Timestamp { get; set; }

    public decimal? BatteryCharge { get; set; }
    public decimal? BatteryVoltage { get; set; }
    public decimal? LoadPercentage { get; set; }
    public decimal? InputVoltage { get; set; }
    public decimal? OutputVoltage { get; set; }
    public int? RuntimeSeconds { get; set; }
    public decimal? Temperature { get; set; }
    public decimal? Frequency { get; set; }
    public decimal? Power { get; set; }
    public UpsStatus Status { get; set; }
}
