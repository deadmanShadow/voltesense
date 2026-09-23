namespace VoltSense.Application.DTOs;

/// <summary>
/// Read-only projection of an <c>UpsDevice</c> aggregate suitable for
/// transport to API consumers (controllers, SignalR clients).
/// <para>
/// This DTO MUST stay free of any Entity Framework / Domain Entity
/// references — it is the boundary between the persistence layer and the
/// outside world (PRD §62 rule 4).
/// </para>
/// </summary>
/// <param name="Id">Surrogate primary key.</param>
/// <param name="Manufacturer">Vendor name as reported by the device.</param>
/// <param name="Model">Model name as reported by the device.</param>
/// <param name="ConnectionType">Stringified <c>ConnectionType</c> enum.</param>
/// <param name="FirmwareVersion">Device firmware revision, when known.</param>
/// <param name="LastSeenAt">UTC timestamp of the most recent successful contact.</param>
/// <param name="IsActive"><c>true</c> if this device is currently plugged in.</param>
public sealed record UpsDeviceDto(
    Guid Id,
    string Manufacturer,
    string Model,
    string ConnectionType,
    string? FirmwareVersion,
    DateTimeOffset LastSeenAt,
    bool IsActive);
