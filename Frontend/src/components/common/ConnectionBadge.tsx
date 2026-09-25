/**
 * ConnectionBadge — shadcn Badge + Tooltip + lucide icon
 * (changesFrontend.md §5).
 *
 * Pure presentational. The live state is passed in by the caller so this
 * component is trivially testable.
 *
 * Migration notes:
 *   - The old raw `<span>` dot is replaced with a lucide `Wifi` / `WifiOff`
 *     icon — keeping the badge purely "shadcn primitives" instead of
 *     mixing a raw `<span className="rounded-full …">` element.
 *   - The whole badge is wrapped in a `Tooltip` so a hover (or focus) on
 *     the badge surfaces the underlying state ("Receiving live telemetry"
 *     vs "No live connection to the UPS"). Tooltip text is purely
 *     presentation — it derives from `isConnected`, no new logic.
 *   - Wraps its own `TooltipProvider` so the badge is self-contained when
 *     rendered in isolation (e.g. unit tests). The provider is harmless
 *     when nested inside the AppShell's provider.
 */
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Wifi, WifiOff } from "lucide-react";

export interface ConnectionBadgeProps {
  isConnected: boolean;
  /** Optional explicit label override (e.g. "Searching…" while initial fetch is in-flight). */
  label?: string;
}

export function ConnectionBadge({ isConnected, label }: ConnectionBadgeProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={isConnected ? "default" : "destructive"}
            className="gap-1.5"
            aria-live="polite"
          >
            {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {label ?? (isConnected ? "Connected" : "Disconnected")}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {isConnected ? "Receiving live telemetry" : "No live connection to the UPS"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
