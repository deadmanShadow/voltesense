/**
 * BatteryCard — MUST (frontend.md §9).
 *
 * Renders the current battery charge. Below 20% the percentage text and the
 * progress bar fill both flip to the `danger` colour so the dashboard
 * screams at the user when on-battery time is short.
 *
 * Crucially: when `chargePercent` is `null` the card still renders — it
 * shows `"Unavailable"` instead of crashing or fabricating `0%`. This is
 * the contract from PRD §29.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/formatters";

export interface BatteryCardProps {
  chargePercent: number | null;
  /** Optional status label (rendered next to the percentage). */
  status: string | null;
}

const LOW_BATTERY_THRESHOLD = 20;

export function BatteryCard({ chargePercent, status }: BatteryCardProps) {
  const isLow = chargePercent !== null && chargePercent <= LOW_BATTERY_THRESHOLD;

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Battery</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex items-end justify-between">
          <span
            className={cn(
              "text-4xl font-semibold tracking-tight",
              isLow && "text-danger",
            )}
            aria-live={isLow ? "polite" : undefined}
          >
            {formatPercent(chargePercent)}
          </span>
          {status && (
            <span className="text-sm text-muted-foreground" aria-label="Current status">
              {status}
            </span>
          )}
        </div>
        <Progress
          value={chargePercent}
          aria-label="Battery charge"
          className={cn(isLow && "[&>div]:bg-danger")}
        />
      </CardContent>
    </Card>
  );
}
