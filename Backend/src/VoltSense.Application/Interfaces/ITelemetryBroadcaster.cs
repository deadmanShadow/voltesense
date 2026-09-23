using VoltSense.Application.DTOs;

namespace VoltSense.Application.Interfaces;

/// <summary>
/// Abstraction over the real-time push channel (e.g. SignalR). Keeping
/// this interface in the Application layer means the orchestration code
/// never has to know about SignalR hubs — it depends only on this contract,
/// and the concrete implementation lives in the Api layer
/// (<c>SignalRTelemetryBroadcaster</c>).
/// <para>
/// Every method accepts a <see cref="CancellationToken"/> and MUST
/// propagate it to the underlying transport (PRD §62 rule 9).
/// </para>
/// </summary>
public interface ITelemetryBroadcaster
{
    /// <summary>Push a new telemetry snapshot to every connected client.</summary>
    Task BroadcastTelemetryUpdatedAsync(TelemetryDto telemetry, CancellationToken ct);

    /// <summary>
    /// Push the connection lifecycle event to every connected client.
    /// <c>true</c> = UPS just plugged in, <c>false</c> = UPS just unplugged.
    /// </summary>
    Task BroadcastConnectionChangedAsync(bool isConnected, CancellationToken ct);

    /// <summary>
    /// Push the power-status transition (e.g. Online → OnBattery) to every
    /// connected client. Implementations are expected to deduplicate at
    /// the call-site, not here.
    /// </summary>
    Task BroadcastStatusChangedAsync(string status, CancellationToken ct);
}
