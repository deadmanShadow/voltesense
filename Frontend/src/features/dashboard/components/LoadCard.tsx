/**
 * LoadCard — MUST (frontend.md §9, changesFrontend.md §6).
 *
 * One line: percent of the UPS's rated capacity currently being drawn.
 * When `null` the formatter renders "Unavailable" — never `0%`.
 *
 * Migration notes:
 *   - Added a lucide `Gauge` icon to the card header for visual parity
 *     with the other dashboard tiles. Pure decoration.
 *   - All existing props unchanged.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge } from "lucide-react";
import { formatPercent } from "@/lib/formatters";

export interface LoadCardProps {
  loadPercent: number | null;
}

export function LoadCard({ loadPercent }: LoadCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Load</CardTitle>
        <Gauge className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <span className="text-2xl font-semibold tracking-tight">{formatPercent(loadPercent)}</span>
      </CardContent>
    </Card>
  );
}
