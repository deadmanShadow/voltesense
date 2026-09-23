using Microsoft.AspNetCore.SignalR;
using VoltSense.Application.DTOs;
using VoltSense.Application.Interfaces;

namespace VoltSense.Api.Hubs;

/// <summary>
/// Concrete <see cref="ITelemetryBroadcaster"/> that fans telemetry /
/// connection / status events out to every connected SignalR client via
/// <see cref="UpsHub"/>.
/// <para>
/// This is the only place in the codebase that knows about the SignalR
/// hub. The Application-layer orchestration code talks to
/// <see cref="ITelemetryBroadcaster"/>; this adapter is the seam between
/// Application and the transport. Swapping SignalR for, say, gRPC or
/// SSE only requires a new implementation of the interface — no other
/// production code changes.
/// </para>
/// <para>
/// Every send is awaited, every <see cref="CancellationToken"/> is
/// forwarded to the underlying transport so the worker can shut down
/// promptly (PRD §62 rule 9).
/// </para>
/// </summary>
public sealed class SignalRTelemetryBroadcaster : ITelemetryBroadcaster
{
    // The four event names are kept as constants so a frontend client
    // (and any tests) can reference them without copy-pasting strings.
    public const string TelemetryUpdatedEvent   = "ups:telemetry-updated";
    public const string ConnectedEvent          = "ups:connected";
    public const string DisconnectedEvent       = "ups:disconnected";
    public const string StatusChangedEvent      = "ups:status-changed";

    private readonly IHubContext<UpsHub> _hub;
    private readonly ILogger<SignalRTelemetryBroadcaster> _logger;

    public SignalRTelemetryBroadcaster(
        IHubContext<UpsHub> hub,
        ILogger<SignalRTelemetryBroadcaster> logger)
    {
        _hub = hub ?? throw new ArgumentNullException(nameof(hub));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    public Task BroadcastTelemetryUpdatedAsync(TelemetryDto telemetry, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(telemetry);
        return SendSafeAsync(
            TelemetryUpdatedEvent,
            telemetry,
            "telemetry",
            ct);
    }

    /// <inheritdoc />
    public Task BroadcastConnectionChangedAsync(bool isConnected, CancellationToken ct)
    {
        var eventName = isConnected ? ConnectedEvent : DisconnectedEvent;
        return SendSafeAsync(
            eventName,
            payload: Array.Empty<object>(),
            label: isConnected ? "connected" : "disconnected",
            ct);
    }

    /// <inheritdoc />
    public Task BroadcastStatusChangedAsync(string status, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(status);
        return SendSafeAsync(
            StatusChangedEvent,
            status,
            label: "status",
            ct);
    }

    /// <summary>
    /// Wraps the underlying <c>SendAsync</c> in a try/catch so a flaky
    /// client transport never bubbles up into the monitoring cycle. The
    /// exception is logged at warning level and the cycle continues.
    /// </summary>
    private async Task SendSafeAsync(
        string eventName,
        object payload,
        string label,
        CancellationToken ct)
    {
        try
        {
            await _hub.Clients
                .All
                .SendAsync(eventName, payload, ct)
                .ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            // Cooperative shutdown — re-throw so the worker can exit cleanly.
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Failed to broadcast {Event} ({Label}) — client transport issue",
                eventName, label);
        }
    }
}
