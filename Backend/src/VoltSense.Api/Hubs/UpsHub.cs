using Microsoft.AspNetCore.SignalR;

namespace VoltSense.Api.Hubs;

/// <summary>
/// Read-only SignalR hub surface for live UPS telemetry. The server pushes
/// events to clients; clients MUST NOT be able to invoke any
/// power-control method on the server.
/// <para>
/// Server → client events:
/// <list type="bullet">
///   <item><c>ups:telemetry-updated</c> — payload: <c>TelemetryDto</c>.</item>
///   <item><c>ups:connected</c> — payload: empty; a UPS was just plugged in.</item>
///   <item><c>ups:disconnected</c> — payload: empty; a UPS was just unplugged.</item>
///   <item><c>ups:status-changed</c> — payload: string status name (e.g. <c>"Online"</c>, <c>"OnBattery"</c>).</item>
/// </list>
/// </para>
/// <para>
/// Client → server methods are deliberately absent — this hub exposes no
/// invokable endpoints. If a future need arises to let the dashboard
/// subscribe to a specific UPS, the recommended pattern is query
/// parameters on the URL plus a service-side group, not a method.
/// </para>
/// <para>
/// Connection lifecycle hooks (<see cref="OnConnectedAsync"/>,
/// <see cref="OnDisconnectedAsync"/>) are wired for observability only —
/// they never mutate device state. Authentication, when added, will be
/// applied via <c>[Authorize]</c> attributes on the hub class.
/// </para>
/// </summary>
public class UpsHub : Hub
{
    private readonly ILogger<UpsHub> _logger;

    public UpsHub(ILogger<UpsHub> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation(
            "SignalR client connected: {ConnectionId} (total approximate)",
            Context.ConnectionId);
        await base.OnConnectedAsync().ConfigureAwait(false);
    }

    /// <inheritdoc />
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (exception is not null)
        {
            _logger.LogWarning(exception,
                "SignalR client disconnected unexpectedly: {ConnectionId}",
                Context.ConnectionId);
        }
        else
        {
            _logger.LogInformation(
                "SignalR client disconnected: {ConnectionId}",
                Context.ConnectionId);
        }

        await base.OnDisconnectedAsync(exception).ConfigureAwait(false);
    }
}
