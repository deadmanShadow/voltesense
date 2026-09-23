using VoltSense.Domain.Entities;

namespace VoltSense.Application.Interfaces;

/// <summary>
/// Application-layer abstraction over the persistence Unit of Work.
/// <para>
/// VoltSense uses the repository pattern for UPS-specific queries
/// (see <see cref="VoltSense.Domain.Interfaces.IUpsRepository"/>), but
/// bulk inserts/updates and transactional coordination are cleaner via a
/// thin DbContext facade than via bespoke repository methods. The
/// concrete implementation
/// (<c>VoltSense.Infrastructure.Persistence.VoltSenseDbContext</c>)
/// implements this interface, so the Application layer stays unaware of
/// any concrete data-access framework (Entity Framework, Dapper, …)
/// while still being able to drive atomic multi-aggregate writes.
/// </para>
/// <para>
/// <b>Dependency rule:</b> every type used in this interface must live
/// in either the Application layer or the Domain layer. Infrastructure
/// types — including any EF Core types — are forbidden here so the
/// Application project compiles against the Domain project alone
/// (PRD §62 rule 9).
/// </para>
/// </summary>
public interface IApplicationDbContext
{
    /// <summary>Set of <c>UpsDevice</c> aggregates.</summary>
    IApplicationDbSet<UpsDevice> UpsDevices { get; }

    /// <summary>Set of <c>TelemetrySnapshot</c> rows.</summary>
    IApplicationDbSet<TelemetrySnapshot> TelemetrySnapshots { get; }

    /// <summary>Set of <c>ConnectionEvent</c> rows.</summary>
    IApplicationDbSet<ConnectionEvent> ConnectionEvents { get; }

    /// <summary>Flush all pending changes to the database.</summary>
    Task<int> SaveChangesAsync(CancellationToken ct = default);

    /// <summary>
    /// Begin a database transaction for atomic multi-aggregate writes.
    /// The returned transaction MUST be disposed by the caller.
    /// </summary>
    Task<IApplicationDbContextTransaction> BeginTransactionAsync(CancellationToken ct = default);
}

/// <summary>
/// Framework-agnostic abstraction over a typed entity set. Behaves like
/// a minimal collection: callers can <c>Add</c>, <c>Update</c>,
/// <c>Remove</c>, and enumerate pending entries. The Infrastructure
/// layer adapts the concrete ORM's <c>DbSet&lt;T&gt;</c> to this
/// interface.
/// </summary>
/// <typeparam name="TEntity">The aggregate root type.</typeparam>
public interface IApplicationDbSet<TEntity> : IReadOnlyCollection<TEntity> where TEntity : class
{
    /// <summary>Stage a new entity for insertion. Persistence happens on the next <c>SaveChanges</c>.</summary>
    void Add(TEntity entity);

    /// <summary>Stage an entity update. Persistence happens on the next <c>SaveChanges</c>.</summary>
    void Update(TEntity entity);

    /// <summary>Stage an entity for deletion. Persistence happens on the next <c>SaveChanges</c>.</summary>
    void Remove(TEntity entity);
}

/// <summary>
/// Framework-agnostic abstraction over a database transaction.
/// Infrastructure adapts the concrete provider's transaction type
/// (e.g. EF Core's <c>IDbContextTransaction</c>) to this interface.
/// </summary>
public interface IApplicationDbContextTransaction : IAsyncDisposable
{
    Task CommitAsync(CancellationToken ct = default);
    Task RollbackAsync(CancellationToken ct = default);
}
