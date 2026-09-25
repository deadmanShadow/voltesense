/**
 * DashboardPage — MUST (frontend.md §10, §14, changesFrontend.md §6).
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
 * Migration additions (changesFrontend.md §6, Phase 6):
 *   - A `useEffect` watches the existing `state` from
 *     `useSignalRConnection` and surfaces `toast.warning` /
 *     `toast.success` so the user sees "Reconnecting…" / "Reconnected"
 *     toasts. The hook is unchanged; only the UI now acknowledges its
 *     state changes. No new signal is introduced.
 */
import { useEffect, useRef } from "react";
import { useSignalRConnection } from "@/hooks/useSignalRConnection";
import { useLiveTelemetry } from "./hooks/useLiveTelemetry";
import { useCurrentUps } from "@/features/ups/hooks/useCurrentUps";
import { ApiError } from "@/services/apiClient";
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
import { toast } from "sonner";

const SKELETON_TILES = 6;

export function DashboardPage() {
  const { connection, state } = useSignalRConnection();
  const live = useLiveTelemetry(connection);
  const { device, isLoading, isNoDevice, error, refetch } = useCurrentUps();

  // Presentation-only: surface connection state changes as a toast.
  // Reads the existing `state` from the unchanged hook — no new logic
  // introduced. We track the previous value in a ref so the effect only
  // fires on actual transitions.
  const prevState = useRef(state);
  useEffect(() => {
    if (prevState.current !== state) {
      if (state === "reconnecting") {
        toast.warning("Reconnecting to VoltSense backend…");
      }
      if (state === "connected" && prevState.current === "reconnecting") {
        toast.success("Reconnected");
      }
      prevState.current = state;
    }
  }, [state]);

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
  // State 3: ERROR (transport failure / 5xx — backend unreachable OR
  // backend returned something other than 404). MUST be checked BEFORE
  // the no-device branch: when the backend is down the query never
  // resolves, so `device === null` is also true, and we don't want to
  // misleadingly show "Plug in a UPS" when the real problem is "the
  // backend isn't reachable".
  // ------------------------------------------------------------------
  if (error) {
    const isNetwork = ApiError.isNetworkLike(error);
    return (
      <EmptyState
        title="Unable to read UPS telemetry"
        description={
          isNetwork
            ? "VoltSense couldn't reach the backend. Make sure the API is still running on http://localhost:5279."
            : error.message ||
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
  // State 2: UNSUPPORTED (backend returned 404 — "No UPS detected").
  // Checked AFTER error so a network outage never masquerades as a
  // missing UPS.
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
  // State 4: CONNECTED — render the grid.
  // ------------------------------------------------------------------
  const t = live.telemetry;

  // RuntimeCard shows "On mains" only when:
  //   - We have a positive `isUpsConnected` signal from the backend, AND
  //   - The UPS reports an online/charging status (or hasn't reported yet,
  //     in which case we assume mains; the status card will already flag
  //     a "Disconnected" / "LowBattery" if the backend has spoken).
  // When the backend has *not* confirmed the UPS is connected we show
  // "Unavailable" so the user knows we can't trust a number.
  const backendSaysConnected = live.isUpsConnected;
  const statusSaysOnline =
    live.status === "Online" || live.status === "Charging";
  const onMains = backendSaysConnected && (statusSaysOnline || live.status === null);

  return (
    <div>
      <UpsHeader device={device} />
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
