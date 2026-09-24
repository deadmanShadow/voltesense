/**
 * DeviceInfoCard — static "About this UPS" panel shown below the main grid.
 *
 * Not strictly part of the doc snippet but it gives the user a place to
 * see the manufacturer / model / firmware without grepping logs. Pure
 * presentational.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UNAVAILABLE_LABEL } from "@/lib/formatters";
import type { UpsDevice } from "@/types/ups";

export interface DeviceInfoCardProps {
  device: UpsDevice | null;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground" title={value}>
        {value}
      </dd>
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
          <dl>
            <Row label="Manufacturer" value={device.manufacturer || UNAVAILABLE_LABEL} />
            <Separator />
            <Row label="Model" value={device.model || UNAVAILABLE_LABEL} />
            <Separator />
            <Row label="Connection" value={device.connectionType || UNAVAILABLE_LABEL} />
            <Separator />
            <Row
              label="Firmware"
              value={device.firmwareVersion ?? UNAVAILABLE_LABEL}
            />
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No device metadata available.</p>
        )}
      </CardContent>
    </Card>
  );
}
