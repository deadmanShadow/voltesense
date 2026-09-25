/**
 * UpsHeader — top-of-dashboard banner with device identity.
 *
 * Migration notes (changesFrontend.md §6):
 *   - Added a shadcn `Avatar` showing a monogram (manufacturer initials)
 *     next to the device name. Pure decoration — no remote logo fetch.
 *   - The `ConnectionBadge` is now mounted directly in the header
 *     (replacing the old "global TopBar" indicator — `TopBar.tsx` was
 *     deleted in Phase 3).
 *   - A vertical `Separator` keeps the badge visually distinct on
 *     `md+` viewports.
 *   - Props unchanged: same `device` input.
 */
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ConnectionBadge } from "@/components/common/ConnectionBadge";
import { useSignalRConnection } from "@/hooks/useSignalRConnection";
import { formatRelativeTime } from "@/lib/formatters";
import type { UpsDevice } from "@/types/ups";

export interface UpsHeaderProps {
  device: UpsDevice | null;
}

export function UpsHeader({ device }: UpsHeaderProps) {
  const manufacturer = device?.manufacturer?.trim();
  const model = device?.model?.trim();
  const initials = ((manufacturer && manufacturer.length > 0 ? manufacturer : "VS") as string)
    .slice(0, 2)
    .toUpperCase();

  // Read connection state from the same hook the rest of the app uses;
  // no new signal — just a presentation-time view of `state`.
  const { state } = useSignalRConnection();
  const isConnected = state === "connected";
  const labelByState: Record<typeof state, string> = {
    connected: "Connected",
    connecting: "Connecting…",
    reconnecting: "Reconnecting…",
    disconnected: "Disconnected",
  };

  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="truncate text-xl font-semibold text-foreground">
            {manufacturer && manufacturer.length > 0 ? manufacturer : "VoltSense"}
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            {model && model.length > 0 ? model : "No UPS detected"}
            {device?.lastSeenAt && (
              <>
                {" · last seen "}
                <time dateTime={device.lastSeenAt}>{formatRelativeTime(device.lastSeenAt)}</time>
              </>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Separator orientation="vertical" className="h-8 hidden md:block" />
        <ConnectionBadge isConnected={isConnected} label={labelByState[state]} />
      </div>
    </div>
  );
}
