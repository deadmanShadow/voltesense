using Microsoft.Extensions.Logging;
using VoltSense.Domain.Interfaces;

namespace VoltSense.Application.Services;

/// <summary>
/// Implements the retention policy for the high-write
/// <c>telemetry_snapshots</c> table. Old rows are eligible for deletion
/// once they pass <c>retentionDays</c>; the background worker calls
/// <see cref="ApplyRetentionAsync"/> once per day by convention.
/// <para>
/// The actual <c>DELETE</c> is executed with <c>ExecuteDeleteAsync</c>
/// inside <c>UpsRepository</c> — a single round-trip batch delete, never
/// materialising rows into memory.
/// </para>
/// </summary>
public sealed class TelemetryRetentionService
{
    private readonly IUpsRepository _repository;
    private readonly ILogger<TelemetryRetentionService> _logger;

    public TelemetryRetentionService(IUpsRepository repository, ILogger<TelemetryRetentionService> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Delete every telemetry row older than <c>retentionDays</c> days from
    /// now (UTC). Safe to call when no rows qualify; logs the count when
    /// it does. Honours the supplied <see cref="CancellationToken"/>.
    /// </summary>
    /// <param name="retentionDays">
    /// Number of days of history to keep. Values ≤ 0 are clamped to 1 by
    /// the repository contract's defensive checks.
    /// </param>
    public async Task ApplyRetentionAsync(int retentionDays, CancellationToken ct)
    {
        if (retentionDays < 1)
        {
            _logger.LogWarning(
                "Retention days was {Days} (< 1); skipping retention pass to avoid wiping data",
                retentionDays);
            return;
        }

        var cutoff = DateTimeOffset.UtcNow.AddDays(-retentionDays);
        var deleted = await _repository.DeleteOldTelemetryAsync(cutoff, ct).ConfigureAwait(false);

        if (deleted > 0)
        {
            _logger.LogInformation(
                "Retention: deleted {Count} telemetry rows older than {Cutoff:o}",
                deleted, cutoff);
        }
        else
        {
            _logger.LogDebug("Retention: no telemetry rows older than {Cutoff:o}", cutoff);
        }
    }
}
