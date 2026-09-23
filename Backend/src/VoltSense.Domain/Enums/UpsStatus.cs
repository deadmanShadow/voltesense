namespace VoltSense.Domain.Enums;

/// <summary>
/// Normalized power-state of the connected UPS.
/// Values are intentionally explicit (no Flags) so a single source-of-truth
/// status is always emitted and can be persisted / broadcast as an integer.
/// </summary>
public enum UpsStatus
{
    /// <summary>Initial / unknown state before any telemetry has been read.</summary>
    Unknown = 0,

    /// <summary>Utility power present, battery not in use.</summary>
    Online = 1,

    /// <summary>Utility power lost, UPS is running on battery.</summary>
    OnBattery = 2,

    /// <summary>Battery is critically low and the UPS is about to shut down.</summary>
    LowBattery = 3,

    /// <summary>Battery is recharging while utility is present.</summary>
    Charging = 4,

    /// <summary>Battery is actively discharging (typically while on battery).</summary>
    Discharging = 5,

    /// <summary>No UPS is currently reachable / responding.</summary>
    Disconnected = 6
}
