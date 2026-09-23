using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VoltSense.Domain.Entities;

namespace VoltSense.Infrastructure.Persistence.Configurations;

/// <summary>
/// Fluent-API configuration for <see cref="TelemetrySnapshot"/>.
/// </summary>
/// <remarks>
/// <para>
/// This is the highest-write table in the system. The composite index on
/// <c>(UpsDeviceId, Timestamp)</c> is mandatory: every history query and
/// every retention bulk-delete filters on exactly that pair, and without it
/// the table will degenerate to a sequential scan within hours.
/// </para>
/// <para>
/// <c>Status</c> is stored as <c>int</c> for the same reason as in
/// <see cref="UpsDeviceConfiguration"/>: explicit, sortable, easy to aggregate.
/// </para>
/// </remarks>
public class TelemetrySnapshotConfiguration : IEntityTypeConfiguration<TelemetrySnapshot>
{
    public void Configure(EntityTypeBuilder<TelemetrySnapshot> builder)
    {
        builder.ToTable("telemetry_snapshots");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
               .ValueGeneratedOnAdd(); // bigint identity, assigned by PostgreSQL

        builder.Property(x => x.Timestamp)
               .IsRequired();

        builder.Property(x => x.Status)
               .HasConversion<int>();

        // MUST — high-write time-series table: index on (device, timestamp)
        // for fast history queries and cheap retention sweeps.
        builder.HasIndex(x => new { x.UpsDeviceId, x.Timestamp })
               .HasDatabaseName("ix_telemetry_snapshots_device_timestamp");
    }
}
