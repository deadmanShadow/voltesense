namespace VoltSense.Domain.Entities;

/// <summary>
/// Kind of lifecycle event recorded against a UPS device row.
/// </summary>
public enum ConnectionEventType
{
    /// <summary>The device was detected and a HID stream was successfully opened.</summary>
    Connected = 0,

    /// <summary>The device went away (unplugged, suspended, or stream error).</summary>
    Disconnected = 1,

    /// <summary>A non-fatal error occurred while talking to the device.</summary>
    Error = 2
}

/// <summary>
/// Append-only audit row for UPS connection lifecycle events. Used for
/// post-mortems ("when did the UPS drop last night?") and for driving the
/// <c>ups:connected</c> / <c>ups:disconnected</c> SignalR broadcasts.
/// </summary>
public class ConnectionEvent
{
    public long Id { get; private set; }

    public Guid UpsDeviceId { get; set; }
    public UpsDevice? UpsDevice { get; set; }

    public ConnectionEventType EventType { get; set; }

    /// <summary>Short, safe, non-PII message — for logs / diagnostics only.</summary>
    public string? Message { get; set; }

    public DateTimeOffset OccurredAt { get; set; } = DateTimeOffset.UtcNow;
}
