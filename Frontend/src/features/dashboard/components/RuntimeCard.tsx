/**
 * RuntimeCard — estimated runtime remaining on battery.
 *
 * MUST (frontend.md §9, changesFrontend.md §6). Hidden when on mains
 * (`seconds === 0` would be confusing — runtime is undefined while online),
 * but we don't *hide* the card; instead we render "On mains" so the grid
 * layout stays stable.
 *
 * Migration notes:
 *   - Added a lucide `Clock` icon to the header. Pure decoration.
 *   - All existing props (`seconds`, `onMains`) unchanged.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { formatRuntime } from "@/lib/formatters";

export interface RuntimeCardProps {
  seconds: number | null;
  /** True when the UPS is currently reporting mains power. */
  onMains: boolean;
}

export function RuntimeCard({ seconds, onMains }: RuntimeCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Estimated Runtime</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <span className="text-2xl font-semibold tracking-tight">
          {onMains ? "On mains" : formatRuntime(seconds)}
        </span>
      </CardContent>
    </Card>
  );
}
