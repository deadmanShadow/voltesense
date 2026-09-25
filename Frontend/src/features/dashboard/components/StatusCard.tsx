/**
 * StatusCard — MUST (frontend.md §9, changesFrontend.md §6).
 *
 * `STATUS_VARIANT` is `Record<UpsStatus, …>` so adding a new member to the
 * `UpsStatus` union forces us to pick a visual variant or the build fails.
 *
 * Migration notes:
 *   - Added a lucide `Activity` icon to the header. Pure decoration.
 *   - All existing props unchanged; the test still finds the status string
 *     inside the badge.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Activity } from "lucide-react";
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">UPS Status</CardTitle>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <Badge variant={status ? STATUS_VARIANT[status] : "secondary"} aria-live="polite">
          {status ?? "Unknown"}
        </Badge>
      </CardContent>
    </Card>
  );
}
