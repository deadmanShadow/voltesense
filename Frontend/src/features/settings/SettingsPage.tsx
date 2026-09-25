/**
 * SettingsPage — MUST (frontend.md §12, PRD §31, changesFrontend.md §8).
 *
 * Read-only by design: VoltSense never exposes UPS *control* settings
 * (shutdown / restart / self-test) — that's the core "monitor-only"
 * promise of the project. Anything configurable is server-side
 * (`appsettings.json`) and we explicitly document that here.
 *
 * Migration notes (changesFrontend.md §8):
 *   - Added a `CardDescription` slot to the header card (shadcn pattern).
 *   - The "Read-only by design" callout uses shadcn `Alert` instead of
 *     a free-form paragraph block.
 *   - Data fetching (`useCurrentUps`) and rendered rows are unchanged.
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck } from "lucide-react";
import { useCurrentUps } from "@/features/ups/hooks/useCurrentUps";
import { EmptyState } from "@/components/common/EmptyState";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-mono text-xs text-foreground" title={value}>
        {value}
      </span>
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
          <CardDescription>Per-device metadata reported by the UPS.</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Field label="Manufacturer" value={device.manufacturer || "Unknown"} />
            <Field label="Model" value={device.model || "Unknown"} />
            <Field label="Connection" value={device.connectionType || "Unknown"} />
            <Field label="Firmware" value={device.firmwareVersion ?? "Unavailable"} />
            <Field label="Device ID" value={device.id} />
            <Field label="Active" value={device.isActive ? "Yes" : "No"} />
          </div>
        </CardContent>
      </Card>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Read-only by design</AlertTitle>
        <AlertDescription>
          <p className="mb-2">
            VoltSense never offers shutdown, restart, or self-test controls.
            UPS behaviour is configured at the hardware level; software
            controls are intentionally out of scope.
          </p>
          <p>
            To change polling interval or telemetry retention, edit
            <code className="mx-1 rounded bg-muted px-1">appsettings.json</code>
            on the backend and restart the service.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
