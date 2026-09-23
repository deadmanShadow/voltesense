using VoltSense.Domain.Enums;

namespace VoltSense.Domain.ValueObjects;

/// <summary>
/// Immutable, hardware-derived identity card for a UPS.
/// Returned by <c>IUpsProvider.DetectDevicesAsync</c> / <c>GetDeviceInfoAsync</c>.
/// <para>
/// <see cref="VendorId"/> + <see cref="ProductId"/> + <see cref="SerialNumber"/>
/// together form the natural key of a physical device and are persisted as a
/// unique index on <c>ups_devices</c>.
/// </para>
/// </summary>
public sealed record UpsDeviceInfo(
    string Manufacturer,
    string Model,
    string? SerialNumber,
    string? FirmwareVersion,
    int VendorId,
    int ProductId,
    ConnectionType ConnectionType
);
