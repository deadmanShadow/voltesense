/**
 * BatteryCard — MUST (frontend.md §9, changesFrontend.md §6).
 *
 * Renders the current battery charge. Below 20% the percentage text and the
 * progress bar fill both flip to the `destructive` colour so the dashboard
 * screams at the user when on-battery time is short.
 *
 * Crucially: when `chargePercent` is `null` the card still renders — it
 * shows `"Unavailable"` instead of crashing or fabricating `0%`. This is
 * the contract from PRD §29.
 *
 * Migration notes (changesFrontend.md §6):
 *   - Added a lucide `BatteryFull` icon to the card header, wrapped in a
 *     `Tooltip` so a hover surfaces the current status string. Pure
 *     presentation — `status` was already a prop.
 *   - Wraps its own `TooltipProvider` so the card is self-contained when
 *     rendered in isolation (e.g. unit tests). The provider is harmless
 *     when nested inside the AppShell's provider.
 *   - All existing props (chargePercent, status) unchanged.
 *   - Test contract preserved: low battery still renders `text-danger`
 *     on the percentage span (the test in `BatteryCard.test.tsx` looks
 *     for the `text-danger` token).
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BatteryFull } from "lucide-react";
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
    <TooltipProvider delayDuration={150}>
      <Card className="col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Battery</CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <BatteryFull
                className={cn(
                  "h-4 w-4",
                  isLow ? "text-destructive" : "text-muted-foreground",
                )}
              />
            </TooltipTrigger>
            <TooltipContent>{status ?? "Status unknown"}</TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-end justify-between">
            <span
              className={cn(
                "text-4xl font-semibold tracking-tight",
                // `text-danger` is kept for backwards compatibility with the
                // existing test that asserts on this token. Both
                // `text-danger` and `text-destructive` resolve to the same
                // semantic state.
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
            className={cn(isLow && "[&>div]:bg-destructive")}
          />
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
