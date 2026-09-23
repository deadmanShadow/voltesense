using VoltSense.Domain.Entities;

namespace VoltSense.Domain.Interfaces;

/// <summary>
/// Persistence contract for UPS-related aggregates.
/// Implemented in Infrastructure with EF Core + PostgreSQL.
/// <para>
/// All methods are <c>async</c> and accept a <see cref="CancellationToken"/>;
/// every read MUST honour cooperative cancellation. All write methods flush
/// to the database before returning so the caller can rely on read-after-write
/// consistency within the same scope.
/// </para>
/// </summary>
public interface IUpsRepository
{
    /// <summary>Return the currently-active device row, or <c>null</c> if none.</summary>
    Task<UpsDevice?> GetActiveDeviceAsync(CancellationToken ct = default);

    /// <summary>Find a device by its surrogate primary key.</summary>
    Task<UpsDevice?> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>Return every device row ever recorded.</summary>
    Task<IReadOnlyList<UpsDevice>> GetAllAsync(CancellationToken ct = default);

    /// <summary>
    /// Idempotently insert or refresh a device row. The implementation is
    /// responsible for matching on the (VendorId, ProductId, SerialNumber)
    /// natural key and updating <c>LastSeenAt</c> / <c>IsActive</c> on hits.
    /// </summary>
    Task AddOrUpdateDeviceAsync(UpsDevice device, CancellationToken ct = default);

    /// <summary>Persist a new telemetry snapshot.</summary>
    Task AddTelemetrySnapshotAsync(TelemetrySnapshot snapshot, CancellationToken ct = default);

    /// <summary>Persist a new connection lifecycle event.</summary>
    Task AddConnectionEventAsync(ConnectionEvent evt, CancellationToken ct = default);

    /// <summary>
    /// Return telemetry rows for a device in the half-open interval
    /// [<paramref name="from"/>, <paramref name="to"/>], ordered by timestamp ascending.
    /// </summary>
    Task<IReadOnlyList<TelemetrySnapshot>> GetHistoryAsync(
        Guid deviceId, DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default);

    /// <summary>
    /// Bulk-delete telemetry older than <paramref name="olderThan"/>.
    /// Returns the number of rows actually removed.
    /// </summary>
    Task<int> DeleteOldTelemetryAsync(DateTimeOffset olderThan, CancellationToken ct = default);
}
