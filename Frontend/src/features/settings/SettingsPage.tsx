/**
 * SettingsPage — MUST (frontend.md §12, PRD §31).
 *
 * Read-only by design: VoltSense never exposes UPS *control* settings
 * (shutdown / restart / self-test) — that's the core "monitor-only"
 * promise of the project. Anything configurable is server-side
 * (`appsettings.json`) and we explicitly document that here.
 *
 * We expose the live device's `id` so a curious user can correlate it
 * with backend logs without having to ask.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUps } from "@/features/ups/hooks/useCurrentUps";
import { EmptyState } from "@/components/common/EmptyState";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-mono text-xs text-foreground" title={value}>
        {value}
      </dd>
    </div>
  );
}

export function SettingsPage() {
  const { device, isLoading, isNoDevice } = useCurrentUps();

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (isNoDevice || !device) {
    return (
      <EmptyState
        title="No UPS detected"
        description="VoltSense can show per-device settings once a supported UPS is connected."
      />
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          VoltSense is a read-only monitor. All polling cadence and retention
          controls live in the backend&apos;s <code className="rounded bg-muted px-1">appsettings.json</code>.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Device</CardTitle>
        </CardHeader>
        <CardContent>
          <dl>
            <Field label="Manufacturer" value={device.manufacturer || "Unknown"} />
            <Separator />
            <Field label="Model" value={device.model || "Unknown"} />
            <Separator />
            <Field label="Connection" value={device.connectionType || "Unknown"} />
            <Separator />
            <Field label="Firmware" value={device.firmwareVersion ?? "Unavailable"} />
            <Separator />
            <Field label="Device ID" value={device.id} />
            <Separator />
            <Field label="Active" value={device.isActive ? "Yes" : "No"} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About this page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            VoltSense never offers shutdown, restart, or self-test controls. UPS
            behaviour is configured at the hardware level; software controls are
            intentionally out of scope.
          </p>
          <p>
            To change polling interval or telemetry retention, edit
            <code className="mx-1 rounded bg-muted px-1">appsettings.json</code>
            on the backend and restart the service.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
