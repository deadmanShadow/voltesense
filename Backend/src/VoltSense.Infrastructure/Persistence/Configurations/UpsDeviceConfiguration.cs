using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VoltSense.Domain.Entities;

namespace VoltSense.Infrastructure.Persistence.Configurations;

/// <summary>
/// Fluent-API configuration for <see cref="UpsDevice"/>.
/// </summary>
/// <remarks>
/// <para>
/// The unique index on <c>(VendorId, ProductId, SerialNumber)</c> is the
/// natural-key uniqueness guarantee that lets
/// <see cref="Repositories.UpsRepository.AddOrUpdateDeviceAsync"/> perform
/// idempotent upserts without a race window.
/// </para>
/// <para>
/// Children are deleted <see cref="DeleteBehavior.Cascade"/>: when a device
/// row is purged, its telemetry history and connection events go with it.
/// (Retention is performed in a separate bulk-delete against
/// <c>telemetry_snapshots</c>, never against <c>ups_devices</c>.)
/// </para>
/// </remarks>
public class UpsDeviceConfiguration : IEntityTypeConfiguration<UpsDevice>
{
    public void Configure(EntityTypeBuilder<UpsDevice> builder)
    {
        builder.ToTable("ups_devices");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
               .ValueGeneratedNever(); // Guid is generated client-side in the entity ctor.

        builder.Property(x => x.Manufacturer)
               .HasMaxLength(128)
               .IsRequired();

        builder.Property(x => x.Model)
               .HasMaxLength(128)
               .IsRequired();

        builder.Property(x => x.SerialNumber)
               .HasMaxLength(128);

        builder.Property(x => x.FirmwareVersion)
               .HasMaxLength(64);

        // Persist the enum as int — explicit, future-proof, easy to query/aggregate.
        builder.Property(x => x.ConnectionType)
               .HasConversion<int>();

        // Natural-key uniqueness — used by the upsert path.
        builder.HasIndex(x => new { x.VendorId, x.ProductId, x.SerialNumber })
               .IsUnique()
               .HasDatabaseName("ix_ups_devices_natural_key");

        // Cheap lookup of "the currently plugged-in device".
        builder.HasIndex(x => x.IsActive)
               .HasDatabaseName("ix_ups_devices_is_active");

        // Telemetry: many snapshots per device, cascade-delete.
        builder.HasMany(x => x.TelemetrySnapshots)
               .WithOne(x => x.UpsDevice!)
               .HasForeignKey(x => x.UpsDeviceId)
               .OnDelete(DeleteBehavior.Cascade);

        // Connection events: many events per device, cascade-delete.
        builder.HasMany(x => x.ConnectionEvents)
               .WithOne(x => x.UpsDevice!)
               .HasForeignKey(x => x.UpsDeviceId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
