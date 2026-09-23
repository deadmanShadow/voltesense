using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VoltSense.Domain.Entities;

namespace VoltSense.Infrastructure.Persistence.Configurations;

/// <summary>
/// Fluent-API configuration for <see cref="ConnectionEvent"/>.
/// </summary>
/// <remarks>
/// Append-only audit log. Indexed on <c>(UpsDeviceId, OccurredAt)</c> so the
/// "show me the last N connection events for this device" query stays cheap
/// regardless of total table size.
/// </remarks>
public class ConnectionEventConfiguration : IEntityTypeConfiguration<ConnectionEvent>
{
    public void Configure(EntityTypeBuilder<ConnectionEvent> builder)
    {
        builder.ToTable("connection_events");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
               .ValueGeneratedOnAdd(); // bigint identity, assigned by PostgreSQL

        builder.Property(x => x.OccurredAt)
               .IsRequired();

        builder.Property(x => x.Message)
               .HasMaxLength(512);

        // Persist enum as int — explicit, sortable, no string-conversion overhead.
        builder.Property(x => x.EventType)
               .HasConversion<int>();

        builder.HasIndex(x => new { x.UpsDeviceId, x.OccurredAt })
               .HasDatabaseName("ix_connection_events_device_occurred_at");
    }
}
