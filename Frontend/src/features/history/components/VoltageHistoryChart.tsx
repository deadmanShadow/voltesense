/**
 * VoltageHistoryChart — input and output voltage traces on a single chart.
 *
 * MUST (frontend.md §11). Two `Line`s sharing the same X axis; Y domain is
 * wider here than the %-charts because volt values can swing across
 * 100–250V depending on grid. We use Recharts' `connectNulls={false}` so
 * a missing datapoint never bridges to a neighbouring reading.
 */
import { ChartFrame, type ChartPoint } from "./ChartFrame";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Telemetry } from "@/types/telemetry";
import { formatClockTime } from "@/lib/formatters";

function toPoints(data: Telemetry[]): ChartPoint[] {
  return data.map((d) => ({
    time: formatClockTime(d.timestamp),
    timestamp: d.timestamp,
    input: d.inputVoltage,
    output: d.outputVoltage,
  }));
}

export function VoltageHistoryChart({ data }: { data: Telemetry[] }) {
  const points = toPoints(data);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="time"
          fontSize={11}
          stroke="hsl(var(--muted-foreground))"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, 280]}
          fontSize={11}
          stroke="hsl(var(--muted-foreground))"
          tickLine={false}
          axisLine={false}
          unit=" V"
          width={56}
        />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }} />
        <Line
          type="monotone"
          dataKey="input"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          connectNulls={false}
          name="Input"
        />
        <Line
          type="monotone"
          dataKey="output"
          stroke="hsl(142 71% 45%)" /* success green */
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          connectNulls={false}
          name="Output"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
