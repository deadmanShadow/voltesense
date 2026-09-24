/**
 * LoadHistoryChart — load percentage over time.
 *
 * MUST (frontend.md §11). Same visual language as BatteryHistoryChart;
 * Recharts-only difference is the `seriesKey` (`load`) and a different
 * stroke colour so the two can be overlaid in a future "compare" view.
 */
import { ChartFrame, type ChartPoint } from "./ChartFrame";
import type { Telemetry } from "@/types/telemetry";
import { formatClockTime } from "@/lib/formatters";

function toPoints(data: Telemetry[]): ChartPoint[] {
  return data.map((d) => ({
    time: formatClockTime(d.timestamp),
    timestamp: d.timestamp,
    load: d.loadPercentage,
  }));
}

export function LoadHistoryChart({ data }: { data: Telemetry[] }) {
  return (
    <ChartFrame
      data={toPoints(data)}
      seriesKey="load"
      yDomain={[0, 100]}
      yUnit="%"
      stroke="hsl(38 92% 50%)" /* warning amber */
      seriesLabel="Load"
    />
  );
}
