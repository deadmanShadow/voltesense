using Microsoft.EntityFrameworkCore;
using VoltSense.Domain.Entities;
using VoltSense.Domain.Interfaces;

namespace VoltSense.Infrastructure.Persistence.Repositories;

/// <summary>
/// EF Core implementation of <see cref="IUpsRepository"/>.
/// <para>
/// Every method honours the <see cref="CancellationToken"/> and uses
/// parameterised EF queries (SQL-injection safe by construction).
/// </para>
/// <para>
/// Reads use <c>AsNoTracking()</c> where the entity is not going to be mutated
/// in the same scope — this avoids wasted change-tracker work on hot paths
/// like history queries.
/// </para>
/// </summary>
public class UpsRepository : IUpsRepository
{
    private readonly VoltSenseDbContext _db;

    public UpsRepository(VoltSenseDbContext db) => _db = db;

    public Task<UpsDevice?> GetActiveDeviceAsync(CancellationToken ct = default) =>
        _db.UpsDevices.FirstOrDefaultAsync(x => x.IsActive, ct);

    public Task<UpsDevice?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.UpsDevices.FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task<IReadOnlyList<UpsDevice>> GetAllAsync(CancellationToken ct = default) =>
        await _db.UpsDevices.AsNoTracking().ToListAsync(ct);

    /// <summary>
    /// Idempotent upsert keyed by the natural (VendorId, ProductId, SerialNumber)
    /// tuple. If a row matches, only <c>LastSeenAt</c> / <c>FirmwareVersion</c>
    /// / <c>IsActive</c> / <c>UpdatedAt</c> are touched — everything else
    /// (manufacturer, model, first-detected timestamp) is left intact so that
    /// historical telemetry keeps pointing at a stable device identity.
    /// </summary>
    public async Task AddOrUpdateDeviceAsync(UpsDevice device, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(device);

        var now = DateTimeOffset.UtcNow;

        var existing = await _db.UpsDevices.FirstOrDefaultAsync(
            x => x.VendorId == device.VendorId
              && x.ProductId == device.ProductId
              && x.SerialNumber == device.SerialNumber,
            ct);

        if (existing is null)
        {
            device.FirstDetectedAt = now;
            device.LastSeenAt = now;
            device.IsActive = true;
            device.CreatedAt = now;
            device.UpdatedAt = now;
            _db.UpsDevices.Add(device);
        }
        else
        {
            existing.LastSeenAt = now;
            existing.FirmwareVersion = device.FirmwareVersion;
            existing.IsActive = true;
            existing.UpdatedAt = now;
        }

        await _db.SaveChangesAsync(ct);
    }

    public async Task AddTelemetrySnapshotAsync(TelemetrySnapshot snapshot, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(snapshot);

        _db.TelemetrySnapshots.Add(snapshot);
        await _db.SaveChangesAsync(ct);
    }

    public async Task AddConnectionEventAsync(ConnectionEvent evt, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(evt);

        if (evt.OccurredAt == default)
            evt.OccurredAt = DateTimeOffset.UtcNow;

        _db.ConnectionEvents.Add(evt);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<TelemetrySnapshot>> GetHistoryAsync(
        Guid deviceId,
        DateTimeOffset from,
        DateTimeOffset to,
        CancellationToken ct = default)
    {
        // Defensive: if a caller accidentally swaps from/to, normalise so we
        // never return an empty page for what is clearly the wrong direction.
        if (to < from) (from, to) = (to, from);

        return await _db.TelemetrySnapshots
            .AsNoTracking()
            .Where(x => x.UpsDeviceId == deviceId
                     && x.Timestamp >= from
                     && x.Timestamp <= to)
            .OrderBy(x => x.Timestamp)
            .ToListAsync(ct);
    }

    /// <summary>
    /// Bulk-delete telemetry older than <paramref name="olderThan"/>.
    /// Uses <c>ExecuteDeleteAsync</c> so the database emits a single
    /// <c>DELETE … WHERE timestamp &lt; @cutoff</c> statement — no entities
    /// are materialised into the change tracker.
    /// </summary>
    public Task<int> DeleteOldTelemetryAsync(DateTimeOffset olderThan, CancellationToken ct = default) =>
        _db.TelemetrySnapshots
           .Where(x => x.Timestamp < olderThan)
           .ExecuteDeleteAsync(ct);
}
