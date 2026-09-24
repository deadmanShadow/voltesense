/**
 * StatusCard — MUST (frontend.md §9).
 *
 * `STATUS_VARIANT` is `Record<UpsStatus, …>` so adding a new member to the
 * `UpsStatus` union forces us to pick a visual variant or the build fails.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import type { UpsStatus } from "@/types/telemetry";

const STATUS_VARIANT: Record<UpsStatus, BadgeVariant> = {
  Online: "success",
  Charging: "success",
  OnBattery: "warning",
  Discharging: "warning",
  LowBattery: "destructive",
  Disconnected: "destructive",
  Unknown: "secondary",
};

export interface StatusCardProps {
  status: UpsStatus | null;
}

export function StatusCard({ status }: StatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>UPS Status</CardTitle>
      </CardHeader>
      <CardContent>
        <Badge variant={status ? STATUS_VARIANT[status] : "secondary"} aria-live="polite">
          {status ?? "Unknown"}
        </Badge>
      </CardContent>
    </Card>
  );
}
