namespace VoltSense.Domain.Enums;

/// <summary>
/// Transport used to communicate with the UPS.
/// Today only <see cref="UsbHid"/> is implemented; the others are reserved
/// for future providers (serial, network/NUT bridge, …) and are never
/// surfaced unless a concrete <c>IUpsProvider</c> implementation reports them.
/// </summary>
public enum ConnectionType
{
    UsbHid = 0,

    /// <summary>Reserved for a future RS-232 / USB-CDC provider.</summary>
    Serial = 1,

    /// <summary>Reserved for a future network (e.g. apcupsd / NUT) provider.</summary>
    Network = 2
}
