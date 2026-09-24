/**
 * Domain types — MUST (frontend.md §4).
 *
 * These types are a *strict 1:1 mirror* of the backend DTOs. Per PRD §62 rule 1,
 * any field change must be applied on both sides in the same commit. `null`
 * (not `undefined`) is used on the wire to convey "sensor did not report a value
 * for this reading" and must be preserved through to the UI — formatters must
 * never invent a value.
 *
 * Serialization rules (must match ASP.NET defaults):
 *   - `Date`/date-times are ISO-8601 strings with `Z` UTC suffix.
 *   - `null` JSON values stay `null` in TypeScript — they are *not* undefined.
 *   - Enums arrive as their string names (System.Text.Json default).
 */

/**
 * UPS operating status.
 *
 * MUST mirror `TelemetryStatus` (or equivalent) in the backend exactly.
 * Values are intentionally a closed union so exhaustive `switch` checks
 * are compile-time enforced.
 */
export type UpsStatus =
  | "Unknown"
  | "Online"
  | "OnBattery"
  | "LowBattery"
  | "Charging"
  | "Discharging"
  | "Disconnected";

/**
 * Telemetry — a single point-in-time snapshot of the UPS.
 *
 * Wrapped in a domain interface (`Telemetry`) rather than reusing the raw DTO
 * so future backend renames don't ripple through the UI. Both shapes are
 * identical for v1.
 */
export interface Telemetry {
  /** UTC timestamp (ISO-8601) at which the reading was sampled. */
  timestamp: string;

  /** Battery charge percent (0–100). `null` if not reported. */
  batteryCharge: number | null;

  /** Battery voltage in volts. `null` if not reported. */
  batteryVoltage: number | null;

  /** Load on the UPS, expressed as a percentage of rated capacity. `null` if not reported. */
  loadPercentage: number | null;

  /** Mains input voltage in volts. `null` if not reported. */
  inputVoltage: number | null;

  /** Output voltage in volts. `null` if not reported. */
  outputVoltage: number | null;

  /** Estimated runtime on battery in seconds. `null` if not reported. */
  runtimeSeconds: number | null;

  /** Internal temperature in °C. `null` if not reported. */
  temperature: number | null;

  /** Output frequency in Hz. `null` if not reported. */
  frequency: number | null;

  /** Real power draw in Watts. `null` if not reported. */
  power: number | null;

  /** Current operating status. */
  status: UpsStatus;
}
