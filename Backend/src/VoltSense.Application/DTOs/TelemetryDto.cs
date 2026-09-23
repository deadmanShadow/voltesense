namespace VoltSense.Application.DTOs;

/// <summary>
/// Read-only projection of a single <c>TelemetrySnapshot</c> row, suitable
/// for transport to API consumers and SignalR clients.
/// <para>
/// Every measurement field is nullable: a <c>null</c> means the device
/// did not report that measurement at this instant (PRD §13 / §62 rule 13).
/// Frontend MUST render <c>null</c> as "Unavailable" — never as zero or a
/// placeholder value.
/// </para>
/// </summary>
/// <param name="Timestamp">UTC instant the reading was taken.</param>
/// <param name="BatteryCharge">Battery state of charge, percent (0–100).</param>
/// <param name="BatteryVoltage">Battery terminal voltage, volts DC.</param>
/// <param name="LoadPercentage">Output load as a percent of nominal rating.</param>
/// <param name="InputVoltage">Mains / input voltage, volts AC.</param>
/// <param name="OutputVoltage">Output voltage, volts AC.</param>
/// <param name="RuntimeSeconds">Estimated runtime on battery, seconds.</param>
/// <param name="Temperature">Internal UPS temperature, degrees Celsius.</param>
/// <param name="Frequency">Mains frequency, hertz.</param>
/// <param name="Power">Real output power, watts.</param>
/// <param name="Status">Stringified <c>UpsStatus</c> enum.</param>
public sealed record TelemetryDto(
    DateTimeOffset Timestamp,
    decimal? BatteryCharge,
    decimal? BatteryVoltage,
    decimal? LoadPercentage,
    decimal? InputVoltage,
    decimal? OutputVoltage,
    int? RuntimeSeconds,
    decimal? Temperature,
    decimal? Frequency,
    decimal? Power,
    string Status);
