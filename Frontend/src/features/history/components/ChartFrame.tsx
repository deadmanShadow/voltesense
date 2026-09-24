/**
 * ChartFrame — shared shell for every Recharts chart in VoltSense.
 *
 * - Always responsive (fills parent).
 * - Standardised axes, grid, tooltip styling. Three different chart types
 *   ride on top so they look like one family.
 * - Default `height` of 260px matches the doc snippet for `BatteryHistoryChart`.
 *
 * MUST — frontend.md §11 (Phase 10). Pure presentational; it never reads
 * state itself.
 */
import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { formatClockTime } from "@/lib/formatters";

export interface ChartPoint {
  /** X-axis label (already formatted clock time, e.g. "14:32"). */
  time: string;
  /** Y-axis label used by hover tooltip. */
  timestamp: string;
  /** All numeric fields are nullable so a missing reading leaves a gap. */
  [seriesKey: string]: string | number | null;
}

export interface ChartFrameProps {
  data: ChartPoint[];
  /** Recharts `dataKey` for the line. */
  seriesKey: string;
  /** Domain of the Y axis (e.g. [0, 100] for percent). */
  yDomain: [number, number];
  /** Y-axis unit suffix (e.g. "%", " V"). */
  yUnit?: string;
  /** Stroke colour for the line — defaults to primary. */
  stroke?: string;
  /** Chart height in px. */
  height?: number;
  /** Optional human-readable series name for tooltip. */
  seriesLabel?: string;
}

function ChartTooltip(props: TooltipProps<number, string> & { seriesLabel?: string }) {
  const { active, payload, label, seriesLabel } = props;
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0];
  if (!point) return null;
  const ts = (point.payload as { timestamp?: string } | undefined)?.timestamp;
  return (
    <div className="rounded-md border border-border bg-background/95 px-2.5 py-1.5 text-xs shadow-md">
      <div className="font-medium text-foreground">{label}</div>
      <div className="text-muted-foreground">
        {ts && (
          <time dateTime={ts} className="mr-2 tabular-nums">
            {formatClockTime(ts)}
          </time>
        )}
        <span className="font-mono text-foreground">
          {point.value === null || point.value === undefined || Number.isNaN(point.value)
            ? "Unavailable"
            : `${point.value}${seriesLabel ? "" : ""}`}
        </span>
      </div>
    </div>
  );
}

export function ChartFrame({
  data,
  seriesKey,
  yDomain,
  yUnit = "",
  stroke = "hsl(var(--primary))",
  height = 260,
  seriesLabel,
}: ChartFrameProps) {
  const enrichedData = useMemo(() => data, [data]);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={enrichedData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="time"
          fontSize={11}
          stroke="hsl(var(--muted-foreground))"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={yDomain}
          fontSize={11}
          stroke="hsl(var(--muted-foreground))"
          tickLine={false}
          axisLine={false}
          unit={yUnit}
          width={48}
        />
        <Tooltip content={<ChartTooltip seriesLabel={seriesLabel} />} />
        <Line
          type="monotone"
          dataKey={seriesKey}
          stroke={stroke}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          connectNulls={false}
          name={seriesLabel ?? seriesKey}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
