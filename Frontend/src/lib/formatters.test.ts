/**
 * Formatter tests — MUST (frontend.md §17, PRD §29).
 *
 * The hard contract: any `null` input renders the literal string
 * `"Unavailable"`. We assert that for every formatter. We also assert
 * the *numeric* behaviour so a future "let's round to 0 decimals"
 * refactor doesn't slip past code review.
 */
import { describe, expect, it } from "vitest";
import {
  UNAVAILABLE_LABEL,
  formatClockTime,
  formatFrequency,
  formatPercent,
  formatRelativeTime,
  formatRuntime,
  formatTemperature,
  formatVoltage,
  formatWatts,
} from "./formatters";

describe("formatPercent", () => {
  it("renders null as 'Unavailable'", () => {
    expect(formatPercent(null)).toBe(UNAVAILABLE_LABEL);
  });

  it("rounds to the nearest integer percent", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(50.4)).toBe("50%");
    expect(formatPercent(50.5)).toBe("51%"); // banker's? No — Math.round rounds .5 up
    expect(formatPercent(99.9)).toBe("100%");
  });

  it("appends the percent suffix", () => {
    expect(formatPercent(42)).toMatch(/%$/);
  });
});

describe("formatVoltage", () => {
  it("renders null as 'Unavailable'", () => {
    expect(formatVoltage(null)).toBe(UNAVAILABLE_LABEL);
  });

  it("keeps one decimal of precision", () => {
    expect(formatVoltage(230)).toBe("230.0 V");
    expect(formatVoltage(119.876)).toBe("119.9 V");
  });
});

describe("formatWatts", () => {
  it("renders null as 'Unavailable'", () => {
    expect(formatWatts(null)).toBe(UNAVAILABLE_LABEL);
  });

  it("rounds to nearest integer watts", () => {
    expect(formatWatts(45.4)).toBe("45 W");
    expect(formatWatts(45.6)).toBe("46 W");
  });
});

describe("formatRuntime", () => {
  it("renders null and negative seconds as 'Unavailable'", () => {
    expect(formatRuntime(null)).toBe(UNAVAILABLE_LABEL);
    expect(formatRuntime(-1)).toBe(UNAVAILABLE_LABEL);
  });

  it("renders sub-minute runtimes as '<1 min'", () => {
    expect(formatRuntime(0)).toBe("<1 min");
    expect(formatRuntime(45)).toBe("<1 min");
  });

  it("renders minute-only runtimes", () => {
    expect(formatRuntime(60)).toBe("1 min");
    expect(formatRuntime(45 * 60)).toBe("45 min");
  });

  it("renders hour + minute runtimes, omitting minutes when zero", () => {
    expect(formatRuntime(60 * 60)).toBe("1h");
    expect(formatRuntime(60 * 60 + 30 * 60)).toBe("1h 30m");
    expect(formatRuntime(3 * 60 * 60 + 17 * 60)).toBe("3h 17m");
  });

  it("renders day + hour runtimes beyond 24h", () => {
    const oneDay = 24 * 60 * 60;
    expect(formatRuntime(oneDay)).toBe("1d");
    expect(formatRuntime(oneDay + 4 * 60 * 60)).toBe("1d 4h");
  });
});

describe("formatTemperature", () => {
  it("renders null as 'Unavailable'", () => {
    expect(formatTemperature(null)).toBe(UNAVAILABLE_LABEL);
  });

  it("uses one decimal place with the degree-Celsius suffix", () => {
    expect(formatTemperature(22)).toBe("22.0\u00B0C");
    expect(formatTemperature(37.456)).toBe("37.5\u00B0C");
  });
});

describe("formatFrequency", () => {
  it("renders null as 'Unavailable'", () => {
    expect(formatFrequency(null)).toBe(UNAVAILABLE_LABEL);
  });

  it("uses two decimal places", () => {
    expect(formatFrequency(50)).toBe("50.00 Hz");
    expect(formatFrequency(60.0123)).toBe("60.01 Hz");
  });
});

describe("formatRelativeTime", () => {
  const NOW = new Date("2026-01-15T12:00:00Z");

  it("renders null as 'Unavailable'", () => {
    expect(formatRelativeTime(null, NOW)).toBe(UNAVAILABLE_LABEL);
  });

  it("renders invalid date strings as 'Unavailable'", () => {
    expect(formatRelativeTime("not a date", NOW)).toBe(UNAVAILABLE_LABEL);
  });

  it("renders 'in the past' as e.g. '5 minutes ago'", () => {
    const fiveMinAgo = new Date(NOW.getTime() - 5 * 60_000);
    expect(formatRelativeTime(fiveMinAgo, NOW)).toBe("5 minutes ago");
  });

  it("renders 'in the future' as e.g. 'in 5 minutes'", () => {
    const fiveMinFuture = new Date(NOW.getTime() + 5 * 60_000);
    expect(formatRelativeTime(fiveMinFuture, NOW)).toBe("in 5 minutes");
  });
});

describe("formatClockTime", () => {
  it("renders invalid date strings as 'Unavailable'", () => {
    expect(formatClockTime("garbage")).toBe(UNAVAILABLE_LABEL);
  });

  it("renders a valid Date as hour:minute", () => {
    const out = formatClockTime(new Date("2026-04-01T09:05:00"));
    expect(out).toMatch(/09:05/);
  });
});
