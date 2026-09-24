/**
 * useLiveTelemetry — MUST (frontend.md §6).
 *
 * Subscribes to four hub methods on the supplied connection and exposes
 * a stable snapshot of the latest data the backend has pushed:
 *
 *   - `telemetry`        — most recent `Telemetry` payload (or null until first push)
 *   - `isUpsConnected`   — physical UPS presence (driven by ups:connected/disconnected)
 *   - `status`           — most recent UpsStatus (driven by both telemetry & status-changed)
 *
 * Design choices:
 *   - The hook is *consumer* of a connection owned elsewhere
 *     (`useSignalRConnection`). This separation is what enables the strict
 *     test in §17 (mock a `HubConnection` and verify event handlers).
 *   - All `on` calls use the *same function reference* in `off` — SignalR's
 *     `off(name)` only unregisters the exact reference passed, so this matters.
 *   - Handlers all use functional `setState((prev) => …)` so a fast telemetry
 *     burst from the hub never overwrites a still-newer status-changed event
 *     with stale data.
 *   - `connection` may be null on the very first render — we no-op cleanly
 *     and return the initial empty state. Consumers (`DashboardPage`) handle
 *     this with skeletons.
 */
import { useEffect, useState } from "react";
import type { HubConnection } from "@microsoft/signalr";
import type { Telemetry, UpsStatus } from "@/types/telemetry";
import { UPS_HUB_METHODS } from "@/services/signalrService";

export interface LiveTelemetryState {
  /** Most recent telemetry payload, or `null` until the first push arrives. */
  telemetry: Telemetry | null;
  /** Backend believes a physical UPS is connected right now. */
  isUpsConnected: boolean;
  /** Most recent status — comes from either telemetry OR status-changed event. */
  status: UpsStatus | null;
}

const INITIAL_STATE: LiveTelemetryState = {
  telemetry: null,
  isUpsConnected: false,
  status: null,
};

export function useLiveTelemetry(connection: HubConnection | null): LiveTelemetryState {
  const [state, setState] = useState<LiveTelemetryState>(INITIAL_STATE);

  useEffect(() => {
    if (!connection) {
      // No connection yet — reset so a stale state from a previous mount
      // can't leak into a new one (e.g. hot reload).
      setState(INITIAL_STATE);
      return;
    }

    // ---- Handlers ----
    const onTelemetryUpdated = (payload: Telemetry) =>
      setState((prev) => ({
        ...prev,
        telemetry: payload,
        // Telemetry always carries its own status; promote it here too so
        // consumers that only watch `status` still get updates.
        status: payload.status,
      }));

    const onConnected = () =>
      setState((prev) => ({ ...prev, isUpsConnected: true }));

    const onDisconnected = () =>
      setState((prev) => ({ ...prev, isUpsConnected: false }));

    const onStatusChanged = (nextStatus: UpsStatus) =>
      setState((prev) => ({ ...prev, status: nextStatus }));

    // ---- Register (using the SAME function refs for off) ----
    connection.on(UPS_HUB_METHODS.TelemetryUpdated, onTelemetryUpdated);
    connection.on(UPS_HUB_METHODS.Connected, onConnected);
    connection.on(UPS_HUB_METHODS.Disconnected, onDisconnected);
    connection.on(UPS_HUB_METHODS.StatusChanged, onStatusChanged);

    return () => {
      connection.off(UPS_HUB_METHODS.TelemetryUpdated, onTelemetryUpdated);
      connection.off(UPS_HUB_METHODS.Connected, onConnected);
      connection.off(UPS_HUB_METHODS.Disconnected, onDisconnected);
      connection.off(UPS_HUB_METHODS.StatusChanged, onStatusChanged);
    };
  }, [connection]);

  return state;
}
