namespace VoltSense.Application.Interfaces;

/// <summary>
/// Orchestration contract invoked once per polling cycle by the background
/// monitoring worker. A single cycle probes the hardware, persists the
/// resulting state, and broadcasts change events to subscribed clients.
/// <para>
/// Implementations MUST be safe to call repeatedly and MUST be idempotent
/// per cycle (PRD §33 / §60). They MUST NOT throw for transient hardware
/// failures — a failed cycle returns silently and the next cycle retries.
/// </para>
/// </summary>
public interface IUpsMonitoringService
{
    /// <summary>
    /// Execute one monitoring pass: probe connection, refresh the device
    /// row, sample telemetry, persist, broadcast. Honours the supplied
    /// <paramref name="ct"/> for cooperative cancellation.
    /// </summary>
    Task RunMonitoringCycleAsync(CancellationToken ct);
}
