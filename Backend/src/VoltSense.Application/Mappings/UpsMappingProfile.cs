using VoltSense.Application.DTOs;
using VoltSense.Domain.Entities;

namespace VoltSense.Application.Mappings;

/// <summary>
/// Pure-function mapping layer between Domain entities and Application DTOs.
/// <para>
/// We deliberately avoid AutoMapper here: the project is small, every
/// mapping is fully type-safe, and a hand-rolled profile is easier to
/// audit and to unit-test (PRD §62 rule 5 — prefer simple, explicit
/// code over magic).
/// </para>
/// </summary>
public static class UpsMappingProfile
{
    /// <summary>Map a persistent <see cref="UpsDevice"/> to its DTO.</summary>
    public static UpsDeviceDto ToDto(UpsDevice d)
    {
        ArgumentNullException.ThrowIfNull(d);
        return new UpsDeviceDto(
            Id:              d.Id,
            Manufacturer:    d.Manufacturer,
            Model:           d.Model,
            ConnectionType:  d.ConnectionType.ToString(),
            FirmwareVersion: d.FirmwareVersion,
            LastSeenAt:      d.LastSeenAt,
            IsActive:        d.IsActive);
    }

    /// <summary>Map a persisted <see cref="TelemetrySnapshot"/> to its DTO.</summary>
    public static TelemetryDto ToDto(TelemetrySnapshot s)
    {
        ArgumentNullException.ThrowIfNull(s);
        return new TelemetryDto(
            Timestamp:        s.Timestamp,
            BatteryCharge:    s.BatteryCharge,
            BatteryVoltage:   s.BatteryVoltage,
            LoadPercentage:   s.LoadPercentage,
            InputVoltage:     s.InputVoltage,
            OutputVoltage:    s.OutputVoltage,
            RuntimeSeconds:   s.RuntimeSeconds,
            Temperature:      s.Temperature,
            Frequency:        s.Frequency,
            Power:            s.Power,
            Status:           s.Status.ToString());
    }
}
