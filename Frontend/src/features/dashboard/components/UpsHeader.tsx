/**
 * UpsHeader — top-of-dashboard banner with device identity.
 *
 * The realtime connection indicator lives in the global `TopBar`
 * (Phase 12), so this header is identity-only now. Keeping a dedicated
 * header means the dashboard's title still reads "APC Back-UPS 1500"
 * rather than the generic app name.
 */
import { formatRelativeTime } from "@/lib/formatters";
import type { UpsDevice } from "@/types/ups";

export interface UpsHeaderProps {
  device: UpsDevice | null;
}

export function UpsHeader({ device }: UpsHeaderProps) {
  const manufacturer = device?.manufacturer?.trim();
  const model = device?.model?.trim();

  return (
    <header className="mb-6">
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
    </header>
  );
}
