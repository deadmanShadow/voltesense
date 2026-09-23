using VoltSense.Domain.Enums;

namespace VoltSense.Domain.Entities;

/// <summary>
/// Persistent record of a UPS that VoltSense has ever seen.
/// Identity is the database surrogate <see cref="Id"/>; uniqueness in the
/// physical world is enforced by the (VendorId, ProductId, SerialNumber)
/// index configured in Infrastructure.
/// <para>
/// All scalar setters are <c>public set</c> on purpose — EF Core's change
/// tracker needs them, and the entity has no invariants that would warrant
/// a fully encapsulated model. Collection setters likewise.
/// </para>
/// </summary>
public class UpsDevice
{
    /// <summary>Surrogate primary key. Generated client-side as a Guid v4.</summary>
    public Guid Id { get; private set; } = Guid.NewGuid();

    public string Manufacturer { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string? SerialNumber { get; set; }

    /// <summary>USB vendor identifier (16-bit). Always populated for HID devices.</summary>
    public int VendorId { get; set; }

    /// <summary>USB product identifier (16-bit). Always populated for HID devices.</summary>
    public int ProductId { get; set; }

    public ConnectionType ConnectionType { get; set; }

    public string? FirmwareVersion { get; set; }

    /// <summary>UTC timestamp of the very first time the device was seen.</summary>
    public DateTimeOffset FirstDetectedAt { get; set; }

    /// <summary>UTC timestamp of the most recent successful contact with the device.</summary>
    public DateTimeOffset LastSeenAt { get; set; }

    /// <summary>
    /// Whether this row represents the device currently plugged in.
    /// At most one row should be <c>true</c> at any time; the repository
    /// implementation is responsible for upholding that invariant.
    /// </summary>
    public bool IsActive { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties. Initialised to empty collections so callers can
    // safely enumerate them before EF Core has materialised the children.
    public ICollection<TelemetrySnapshot> TelemetrySnapshots { get; set; } = new List<TelemetrySnapshot>();
    public ICollection<ConnectionEvent> ConnectionEvents { get; set; } = new List<ConnectionEvent>();
}
