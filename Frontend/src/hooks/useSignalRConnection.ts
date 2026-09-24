/**
 * useSignalRConnection — MUST (frontend.md §6).
 *
 * Owns the lifecycle of a single `HubConnection`:
 *   - Builds it on first mount via `createUpsHubConnection()` (factory).
 *   - Calls `start()` exactly once per mount, even under React Strict Mode's
 *     double-invocation of effects, by guarding with a local `started` flag.
 *   - Subscribes to `onreconnecting` / `onreconnected` / `onclose` and mirrors
 *     the SignalR internal state into a typed React state.
 *   - Stops the connection cleanly on unmount.
 *
 * NOTE — We deliberately do *not* expose the connection via state.
 * Updating React state on every reconnect would force the entire consumer
 * tree to re-render. Instead, we return the stable connection through a
 * ref read on demand (`getConnection()`) and let consumers decide whether
 * the SignalR state change warrants a re-render (typically via
 * `useLiveTelemetry`).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { HubConnection, HubConnectionState as SignalRInternalState } from "@microsoft/signalr";
import { createUpsHubConnection } from "@/services/signalrService";

/** High-level connection states the UI cares about. */
export type HubConnectionState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

/** Map SignalR's internal state names to our public, narrower union. */
function projectState(internal: SignalRInternalState): HubConnectionState {
  switch (internal) {
    case "Connected":
      return "connected";
    case "Connecting":
    case "Negotiating":
      return "connecting";
    case "Reconnecting":
      return "reconnecting";
    case "Disconnected":
      return "disconnected";
    default:
      // Defensive default — SignalR may add new internal states in future.
      return "disconnected";
  }
}

export interface UseSignalRConnectionResult {
  /** Stable connection reference (null only during the very first render). */
  connection: HubConnection | null;
  /** Current public-level state. */
  state: HubConnectionState;
  /** Imperative getter — useful when a child needs the connection without re-rendering. */
  getConnection: () => HubConnection | null;
}

export function useSignalRConnection(): UseSignalRConnectionResult {
  const connectionRef = useRef<HubConnection | null>(null);
  const startedRef = useRef(false);

  const [state, setState] = useState<HubConnectionState>("connecting");

  useEffect(() => {
    // Defence-in-depth: if React ever re-runs the effect without unmounting,
    // do not start two connections.
    if (startedRef.current) return;
    startedRef.current = true;

    const connection = createUpsHubConnection();
    connectionRef.current = connection;

    // Wire lifecycle callbacks BEFORE starting the connection.
    const onConnecting = () => setState("connecting");
    const onReconnecting = () => setState("reconnecting");
    const onReconnected = () => setState("connected");
    const onClosed = () => setState("disconnected");

    connection.onreconnecting(onReconnecting);
    connection.onreconnected(onReconnected);
    connection.onclose(onClosed);

    let cancelled = false;
    connection
      .start()
      .then(() => {
        if (cancelled) {
          // Started but the component already unmounted — stop immediately.
          void connection.stop();
          return;
        }
        setState("connected");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Don't crash the app — surface in UI as disconnected. The reconnect
        // ladder defined in `createUpsHubConnection()` will keep trying.
        // eslint-disable-next-line no-console
        console.warn("[SignalR] start() failed:", err);
        setState("disconnected");
      });

    return () => {
      cancelled = true;
      connection.offreconnecting(onReconnecting);
      connection.offreconnected(onReconnected);
      connection.offclose(onClosed);

      // Stop is fire-and-forget; we don't need to await it in cleanup.
      void connection.stop();

      // Allow another mount (e.g. after remount in dev) to actually start.
      startedRef.current = false;
      connectionRef.current = null;
      onConnecting(); // not strictly needed but keeps state deterministic
    };
  }, []);

  const getConnection = useCallback(() => connectionRef.current, []);

  return { connection: connectionRef.current, state, getConnection };
}
