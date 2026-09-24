/**
 * ConnectionBadge — small pill rendering the realtime connection status.
 *
 * MUST (frontend.md §9). The dot colour comes from our tailwind palette
 * (`bg-success` / `bg-danger`), not from a boolean class switch — Tailwind
 * tree-shakes unused colours otherwise.
 *
 * Pure presentational. The live state is passed in by the caller so this
 * component is trivially testable.
 */
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ConnectionBadgeProps {
  isConnected: boolean;
  /** Optional explicit label override (e.g. "Searching…" while initial fetch is in-flight). */
  label?: string;
}

export function ConnectionBadge({ isConnected, label }: ConnectionBadgeProps) {
  return (
    <Badge
      variant={isConnected ? "success" : "destructive"}
      className="gap-1.5"
      aria-live="polite"
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          isConnected ? "bg-success-foreground" : "bg-destructive-foreground",
        )}
        aria-hidden="true"
      />
      {label ?? (isConnected ? "Connected" : "Disconnected")}
    </Badge>
  );
}
