/**
 * BatteryHistoryChart — MUST (frontend.md §11).
 *
 * Single-line chart of `batteryCharge` (%) over time. `null` values
 * (e.g. a sensor dropout) appear as line gaps — `connectNulls: false`
 * in ChartFrame ensures we don't fabricate continuity across a blackout.
 */
import { ChartFrame, type ChartPoint } from "./ChartFrame";
import type { Telemetry } from "@/types/telemetry";
import { formatClockTime } from "@/lib/formatters";

function toPoints(data: Telemetry[]): ChartPoint[] {
  return data.map((d) => ({
    time: formatClockTime(d.timestamp),
    timestamp: d.timestamp,
    charge: d.batteryCharge,
  }));
}

export function BatteryHistoryChart({ data }: { data: Telemetry[] }) {
  return (
    <ChartFrame
      data={toPoints(data)}
      seriesKey="charge"
      yDomain={[0, 100]}
      yUnit="%"
      seriesLabel="Battery"
    />
  );
}
