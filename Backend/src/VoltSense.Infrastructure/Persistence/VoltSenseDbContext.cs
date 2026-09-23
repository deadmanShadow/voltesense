using Microsoft.EntityFrameworkCore;
using VoltSense.Domain.Entities;

namespace VoltSense.Infrastructure.Persistence;

/// <summary>
/// EF Core database context for VoltSense.
/// <para>
/// All entity / property / index / relationship configuration lives in
/// dedicated <see cref="IEntityTypeConfiguration{TEntity}"/> classes that this
/// context discovers via <c>ApplyConfigurationsFromAssembly</c> — no
/// data-annotation noise is permitted in the Domain layer.
/// </para>
/// <para>
/// Scoped lifetime by default; constructed once per HTTP request via DI.
/// </para>
/// </summary>
public class VoltSenseDbContext : DbContext
{
    public VoltSenseDbContext(DbContextOptions<VoltSenseDbContext> options) : base(options)
    {
    }

    /// <summary>Every UPS device row VoltSense has ever seen.</summary>
    public DbSet<UpsDevice> UpsDevices => Set<UpsDevice>();

    /// <summary>Append-only time-series of telemetry snapshots.</summary>
    public DbSet<TelemetrySnapshot> TelemetrySnapshots => Set<TelemetrySnapshot>();

    /// <summary>Append-only audit log of connection lifecycle events.</summary>
    public DbSet<ConnectionEvent> ConnectionEvents => Set<ConnectionEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Discover all IEntityTypeConfiguration<T> implementations in this assembly.
        // Keeping configuration here (instead of scattered OnModelCreating overrides
        // per entity) preserves the SRP and makes the schema easy to audit.
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(VoltSenseDbContext).Assembly);

        base.OnModelCreating(modelBuilder);
    }
}
