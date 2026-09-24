/**
 * LoadCard — MUST (frontend.md §9).
 *
 * One line: percent of the UPS's rated capacity currently being drawn.
 * When `null` the formatter renders "Unavailable" — never `0%`.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/formatters";

export interface LoadCardProps {
  loadPercent: number | null;
}

export function LoadCard({ loadPercent }: LoadCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Load</CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-2xl font-semibold tracking-tight">{formatPercent(loadPercent)}</span>
      </CardContent>
    </Card>
  );
}
