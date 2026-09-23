using VoltSense.Application.Interfaces;
using VoltSense.Application.Services;

namespace VoltSense.Api.BackgroundServices;

/// <summary>
/// Long-running host that periodically drives
/// <see cref="IUpsMonitoringService.RunMonitoringCycleAsync"/> and
/// (once per day) <see cref="TelemetryRetentionService.ApplyRetentionAsync"/>.
/// <para>
/// Lifecycle / correctness guarantees (PRD §33, §55, §60):
/// <list type="bullet">
///   <item>
///     <b>Crash-resistant:</b> a single failing cycle is logged and the
///     loop continues. The worker MUST NOT die on transient hardware,
///     database, or broadcaster errors.
///   </item>
///   <item>
///     <b>Cooperative shutdown:</b> the supplied
///     <see cref="CancellationToken"/> is forwarded to every awaited
///     operation; the worker stops on the next iteration once it's
///     cancelled.
///   </item>
///   <item>
///     <b>Scoped dependencies:</b> every cycle runs inside a fresh DI
///     scope — the <see cref="IUpsMonitoringService"/>,
///     <see cref="IUpsRepository"/>, and
///     <see cref="TelemetryRetentionService"/> are resolved from the
///     scope's service provider, never from the singleton root.
///   </item>
///   <item>
///     <b>Retention cadence:</b> retention runs only when more than
///     24 hours have elapsed since the last retention pass, so a
///     long-running service does not spam the database.
///   </item>
///   <item>
///     <b>Configurable:</b> interval and retention days come from
///     <c>Monitoring:IntervalSeconds</c> and
///     <c>Monitoring:RetentionDays</c> respectively, with sane
///     fall-backs (5 s / 30 d).
///   </item>
/// </list>
/// </para>
/// </summary>
public sealed class UpsMonitoringWorker : BackgroundService
{
    private const int    DefaultIntervalSeconds = 5;
    private const int    DefaultRetentionDays   = 30;
    private const int    MinIntervalSeconds     = 1;
    private const int    MaxIntervalSeconds     = 3600; // 1 hour
    private const int    MinRetentionDays       = 1;
    private const int    MaxRetentionDays       = 3650; // 10 years
    private static readonly TimeSpan RetentionPeriod = TimeSpan.FromHours(24);

    /// <summary>
    /// Configuration keys match <c>appsettings.json</c> in the Api
    /// project. Kept as constants so tests and tooling can reference
    /// them.
    /// </summary>
    public static class ConfigKeys
    {
        public const string IntervalSeconds = "Monitoring:IntervalSeconds";
        public const string RetentionDays   = "Monitoring:RetentionDays";
    }

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<UpsMonitoringWorker> _logger;

    // Retention state lives on the worker instance (the worker is a
    // long-lived singleton) so RunCycleAsync can update it without
    // resorting to a `ref` parameter (which `async` methods forbid).
    private DateTimeOffset _lastRetentionRun = DateTimeOffset.MinValue;

    public UpsMonitoringWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<UpsMonitoringWorker> logger)
    {
        _scopeFactory  = scopeFactory  ?? throw new ArgumentNullException(nameof(scopeFactory));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _logger        = logger        ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var intervalSeconds = Clamp(
            _configuration.GetValue(ConfigKeys.IntervalSeconds, DefaultIntervalSeconds),
            MinIntervalSeconds, MaxIntervalSeconds);
        var retentionDays = Clamp(
            _configuration.GetValue(ConfigKeys.RetentionDays, DefaultRetentionDays),
            MinRetentionDays, MaxRetentionDays);
        var interval = TimeSpan.FromSeconds(intervalSeconds);
        _lastRetentionRun = DateTimeOffset.MinValue;

        _logger.LogInformation(
            "UPS monitoring worker started (interval: {IntervalSeconds}s, retention: {RetentionDays}d)",
            intervalSeconds, retentionDays);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await RunCycleAsync(retentionDays, stoppingToken).ConfigureAwait(false);

                try
                {
                    await Task.Delay(interval, stoppingToken).ConfigureAwait(false);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break; // Graceful shutdown (PRD §55).
                }
            }
        }
        finally
        {
            _logger.LogInformation("UPS monitoring worker stopped");
        }
    }

    /// <summary>
    /// Executes one monitoring cycle and, when the 24-hour window has
    /// elapsed, a retention pass. Each exception type is handled
    /// independently so cancellation and unexpected failures are
    /// distinct events in the log.
    /// </summary>
    private async Task RunCycleAsync(
        int retentionDays,
        CancellationToken stoppingToken)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();

            var monitoringService = scope.ServiceProvider.GetRequiredService<IUpsMonitoringService>();
            await monitoringService.RunMonitoringCycleAsync(stoppingToken).ConfigureAwait(false);

            // Retention pass — at most once per RetentionPeriod, *after*
            // the monitoring pass has produced fresh telemetry rows so
            // we never accidentally delete rows the user just asked for.
            if (DateTimeOffset.UtcNow - _lastRetentionRun > RetentionPeriod)
            {
                var retention = scope.ServiceProvider.GetRequiredService<TelemetryRetentionService>();
                await retention.ApplyRetentionAsync(retentionDays, stoppingToken).ConfigureAwait(false);
                _lastRetentionRun = DateTimeOffset.UtcNow;
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Cooperative shutdown — propagate up to break the outer loop.
            throw;
        }
        catch (Exception ex)
        {
            // PRD §33 / §60: keep scanning, do not crash, do not throw.
            _logger.LogError(ex,
                "Unhandled error in UPS monitoring cycle — continuing after backoff");
        }
    }

    private static int Clamp(int value, int min, int max) =>
        value < min ? min
                  : value > max ? max
                                : value;
}
