/**
 * DashboardPage — MUST (frontend.md §10, §14).
 *
 * Wires three hooks together:
 *   - useSignalRConnection  → HubConnection lifecycle
 *   - useLiveTelemetry      → realtime telemetry + status events
 *   - useCurrentUps         → initial device metadata + 404-aware "no UPS" state
 *
 * Renders exactly one of the four states documented in §14:
 *
 *   | State          | Trigger                                       | UI                                  |
 *   |----------------|-----------------------------------------------|-------------------------------------|
 *   | Searching      | useCurrentUps is still loading                | 6 Skeleton tiles in 4-col grid      |
 *   | Unsupported    | useCurrentUps.isNoDevice  (404)               | <EmptyState title="No UPS detected">|
 *   | Error          | useCurrentUps.error (non-404)                 | <EmptyState title="Unable to read…">|
 *   | Connected      | realtime telemetry arriving (any state)       | <UpsHeader/> + 6-card grid          |
 *
 * "Connected" is the only state where the cards are *active*. When the
 * SignalR connection is healthy but no telemetry has arrived yet (cold
 * start), the cards still render — fields fall through to "Unavailable"
 * because `Telemetry | null` means every formatter returns "Unavailable".
 * That is the intended PRD §29 behaviour.
 *
 * NOTE — The page consumes `useCurrentUps.error` *and* `useCurrentUps.isNoDevice`
 * as separate signals. That separation is what lets a refresh-pill show
 * "Searching" during a refetch after a transient error, rather than
 * flashing "No UPS detected" → "Searching" → "Unable to read" repeatedly.
 */
import { useSignalRConnection } from "@/hooks/useSignalRConnection";
import { useLiveTelemetry } from "./hooks/useLiveTelemetry";
import { useCurrentUps } from "@/features/ups/hooks/useCurrentUps";
import { UpsHeader } from "./components/UpsHeader";
import { BatteryCard } from "./components/BatteryCard";
import { StatusCard } from "./components/StatusCard";
import { LoadCard } from "./components/LoadCard";
import { VoltageCard } from "./components/VoltageCard";
import { RuntimeCard } from "./components/RuntimeCard";
import { DeviceInfoCard } from "./components/DeviceInfoCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const SKELETON_TILES = 6;

export function DashboardPage() {
  const { connection } = useSignalRConnection();
  const live = useLiveTelemetry(connection);
  const { device, isLoading, isNoDevice, error, refetch } = useCurrentUps();

  // ------------------------------------------------------------------
  // State 1: SEARCHING (initial load from useCurrentUps in-flight)
  // ------------------------------------------------------------------
  if (isLoading) {
    return (
      <section aria-busy="true" aria-live="polite" className="space-y-2">
        <Skeleton className="h-9 w-64" /> {/* header placeholder */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: SKELETON_TILES }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  // ------------------------------------------------------------------
  // State 2: UNSUPPORTED (backend returned 404 — "No UPS detected")
  // ------------------------------------------------------------------
  if (isNoDevice || device === null) {
    return (
      <EmptyState
        title="No UPS detected"
        description="Plug in a supported UPS to start monitoring. VoltSense will pick it up automatically."
        action={
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  // ------------------------------------------------------------------
  // State 3: ERROR (transport failure / 5xx — backend reachable but
  // something else is wrong)
  // ------------------------------------------------------------------
  if (error) {
    return (
      <EmptyState
        title="Unable to read UPS telemetry"
        description={
          error.message ||
          "The backend reported an unexpected error. Check the server logs and try again."
        }
        action={
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  // ------------------------------------------------------------------
  // State 4: CONNECTED — render the grid.
  // ------------------------------------------------------------------
  const t = live.telemetry;
  const onMains =
    live.status === "Online" || live.status === "Charging" || live.status === null;

  return (
    <div>
      <UpsHeader device={device} isConnected={live.isUpsConnected} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <BatteryCard chargePercent={t?.batteryCharge ?? null} status={live.status} />
        <StatusCard status={live.status} />
        <LoadCard loadPercent={t?.loadPercentage ?? null} />
        <VoltageCard label="Input Voltage" voltage={t?.inputVoltage ?? null} />
        <VoltageCard label="Output Voltage" voltage={t?.outputVoltage ?? null} />
        <RuntimeCard seconds={t?.runtimeSeconds ?? null} onMains={onMains} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DeviceInfoCard device={device} />
      </div>
    </div>
  );
}
