/**
 * UpsHeader — top-of-dashboard banner with the device identity and live
 * connection indicator. MUST (frontend.md §9).
 *
 * Layout: identity (left) + `ConnectionBadge` (right). When no device is
 * loaded yet (first paint before `useCurrentUps` resolves) we still
 * render a header so the page skeleton feels structured.
 */
import { ConnectionBadge } from "@/components/common/ConnectionBadge";
import { formatRelativeTime } from "@/lib/formatters";
import type { UpsDevice } from "@/types/ups";

export interface UpsHeaderProps {
  device: UpsDevice | null;
  isConnected: boolean;
}

export function UpsHeader({ device, isConnected }: UpsHeaderProps) {
  const manufacturer = device?.manufacturer?.trim();
  const model = device?.model?.trim();

  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0">
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
      <ConnectionBadge isConnected={isConnected} />
    </header>
  );
}
