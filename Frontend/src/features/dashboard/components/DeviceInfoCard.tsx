/**
 * DeviceInfoCard — static "About this UPS" panel shown below the main grid.
 *
 * Not strictly part of the doc snippet but it gives the user a place to
 * see the manufacturer / model / firmware without grepping logs. Pure
 * presentational.
 *
 * Accessibility note — We use a flat list of labelled <div>s rather than
 * <dl>/<dt>/<dd>, because the WAI-ARIA spec disallows `role="separator"`
 * as a direct child of <dl>. Wrapping each row in a <div> also keeps the
 * layout simpler (no need to interleave separators).
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UNAVAILABLE_LABEL } from "@/lib/formatters";
import type { UpsDevice } from "@/types/ups";

export interface DeviceInfoCardProps {
  device: UpsDevice | null;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium text-foreground" title={value}>
        {value}
      </span>
    </div>
  );
}

export function DeviceInfoCard({ device }: DeviceInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Device</CardTitle>
      </CardHeader>
      <CardContent>
        {device ? (
          <div>
            <Row label="Manufacturer" value={device.manufacturer || UNAVAILABLE_LABEL} />
            <Row label="Model" value={device.model || UNAVAILABLE_LABEL} />
            <Row label="Connection" value={device.connectionType || UNAVAILABLE_LABEL} />
            <Row
              label="Firmware"
              value={device.firmwareVersion ?? UNAVAILABLE_LABEL}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No device metadata available.</p>
        )}
      </CardContent>
    </Card>
  );
}
