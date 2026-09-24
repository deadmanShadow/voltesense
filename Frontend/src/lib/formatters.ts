/**
 * formatters — MUST (frontend.md §8, PRD §29).
 *
 * Hard contract: every formatter takes `number | null` (NOT `undefined`)
 * because that is exactly what backend telemetry carries — a missing
 * sensor reading is `null`, never `undefined`. Functions render the literal
 * string `"Unavailable"` for `null` so the UI **never fabricates a value**.
 *
 * All functions are pure, side-effect free, and cheap (no `Intl` plural
 * rules needed for these units). If you find yourself reaching for
 * `Math.random()` or a default value here — stop — call sites must
 * handle `null` explicitly so the user's trust in the display is preserved.
 */

export const UNAVAILABLE_LABEL = "Unavailable" as const;

/** Suffix constants. Centralised so a future i18n layer has one switch point. */
export const UNITS = {
  percent: "%",
  volt: " V",
  watt: " W",
  hertz: " Hz",
  celsius: "\u00B0C", // °C
} as const;

/**
 * Battery / load percentage. Rounded to the nearest integer — sub-percent
 * precision is below the noise floor of any real UPS reading.
 *
 * @example formatPercent(87.4)  // "87%"
 * @example formatPercent(null)  // "Unavailable"
 */
export function formatPercent(value: number | null): string {
  return value === null ? UNAVAILABLE_LABEL : `${Math.round(value)}${UNITS.percent}`;
}

/**
 * Voltage in volts. One decimal place — that matches the resolution
 * typical Mains/Output monitors expose over USB.
 */
export function formatVoltage(value: number | null): string {
  return value === null ? UNAVAILABLE_LABEL : `${value.toFixed(1)}${UNITS.volt}`;
}

/**
 * Real power in watts. Rounded to nearest integer; below 10W is meaningless
 * for a desktop-class UPS.
 */
export function formatWatts(value: number | null): string {
  return value === null ? UNAVAILABLE_LABEL : `${Math.round(value)}${UNITS.watt}`;
}

/**
 * Estimated runtime on battery. Output forms:
 *   - < 1 minute     → "<1 min"
 *   - < 60 minutes   → "N min"
 *   - < 24 hours     → "Nh Mm"
 *   - ≥ 24 hours     → "Nd Nh"
 *
 * `seconds < 0` is coerced to `Unavailable` (defensive — the backend should
 * never send it, but if it does we don't want "-3 min" on screen).
 */
export function formatRuntime(seconds: number | null): string {
  if (seconds === null || seconds < 0) return UNAVAILABLE_LABEL;

  const totalMinutes = Math.floor(seconds / 60);
  if (totalMinutes < 1) return "<1 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (totalHours < 24) {
    return remainingMinutes === 0
      ? `${totalHours}h`
      : `${totalHours}h ${remainingMinutes}m`;
  }

  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  return remainingHours === 0 ? `${days}d` : `${days}d ${remainingHours}h`;
}

/**
 * Temperature in °C. One decimal place.
 */
export function formatTemperature(value: number | null): string {
  return value === null ? UNAVAILABLE_LABEL : `${value.toFixed(1)}${UNITS.celsius}`;
}

/**
 * Line frequency in Hz. Two decimals — the grid sits at 50.00 or 60.00
 * almost always; precision below that is noise.
 */
export function formatFrequency(value: number | null): string {
  return value === null ? UNAVAILABLE_LABEL : `${value.toFixed(2)}${UNITS.hertz}`;
}

/**
 * Absolute timestamp → "5 min ago" style label, suitable for "last seen"
 * headers. Returns `UNAVAILABLE_LABEL` for invalid dates so the UI can
 * render the same fallback string everywhere.
 *
 * Uses `Intl.RelativeTimeFormat` for localised output ("5 minutes ago" in
 * en-US, "5 minutter siden" in nb-NO, etc.) without a runtime dependency.
 */
export function formatRelativeTime(
  value: string | Date | null,
  now: Date = new Date(),
  locale: string = navigator.language ?? "en-US",
): string {
  if (value === null) return UNAVAILABLE_LABEL;
  const then = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(then.getTime())) return UNAVAILABLE_LABEL;

  const diffMs = then.getTime() - now.getTime(); // negative → past
  const absSec = Math.round(Math.abs(diffMs) / 1000);

  // Buckets picked to match common UPS refresh intervals (1s–24h).
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (absSec < 60) return rtf.format(Math.round(diffMs / 1000), "second");
  if (absSec < 3600) return rtf.format(Math.round(diffMs / 60_000), "minute");
  if (absSec < 86_400) return rtf.format(Math.round(diffMs / 3_600_000), "hour");
  return rtf.format(Math.round(diffMs / 86_400_000), "day");
}

/**
 * Format a clock-time stamp for chart X axes. Uses `date-fns` already in
 * the dependency tree (Phase 1), so no extra cost. Localised to the
 * browser locale.
 */
export function formatClockTime(value: string | Date, locale: string = navigator.language ?? "en-US"): string {
  const then = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(then.getTime())) return UNAVAILABLE_LABEL;
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(then);
}
