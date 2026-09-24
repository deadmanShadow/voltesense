/**
 * fakeHubConnection — minimal in-memory SignalR `HubConnection` for tests.
 *
 * Implements ONLY the surface `useLiveTelemetry` actually touches:
 *   - `on(methodName, handler)`  → registers
 *   - `off(methodName, handler)` → unregisters (matching reference)
 *   - `invoke`                   → never used by our hook, stub
 *   - `onreconnecting / onreconnected / onclose` setters
 *
 * Plus a `emit(methodName, payload)` helper so tests can simulate the
 * server pushing events without needing the real SignalR runtime.
 *
 * Not part of the shipped code — sits under `src/test/` and is excluded
 * from coverage reports by Vitest's default `src/**` include pattern
 * (it's a helper, not a tested module).
 */
import type { HubConnection } from "@microsoft/signalr";
import { UPS_HUB_METHODS } from "@/services/signalrService";

type Handler = (...args: unknown[]) => unknown;

export interface FakeHubConnection {
  /** Mimics `connection.on(name, handler)` — multiple handlers per name. */
  on: (name: string, handler: Handler) => void;
  /** Mimics `connection.off(name, handler)` — exact reference match. */
  off: (name: string, handler: Handler) => void;
  /** Test helper — simulates the server pushing `payload` to `name`. */
  emit: (name: string, payload?: unknown) => void;
  /** Listeners registered so far, for assertions. */
  listeners: Map<string, Set<Handler>>;
  /** No-op stubs for the lifecycle callbacks `useSignalRConnection` uses. */
  onreconnecting: (cb: Handler) => void;
  onreconnected: (cb: Handler) => void;
  onclose: (cb: Handler) => void;
  offreconnecting: (cb: Handler) => void;
  offreconnected: (cb: Handler) => void;
  offclose: (cb: Handler) => void;
}

export function createFakeHubConnection(): FakeHubConnection {
  const listeners = new Map<string, Set<Handler>>();
  const reconnecting = new Set<Handler>();
  const reconnected = new Set<Handler>();
  const closed = new Set<Handler>();

  return {
    listeners,
    on(name: string, handler: Handler) {
      const set = listeners.get(name) ?? new Set();
      set.add(handler);
      listeners.set(name, set);
    },
    off(name: string, handler: Handler) {
      listeners.get(name)?.delete(handler);
    },
    emit(name: string, payload?: unknown) {
      const set = listeners.get(name);
      if (!set) return;
      for (const h of set) h(payload);
    },
    onreconnecting(cb: Handler) {
      reconnecting.add(cb);
    },
    onreconnected(cb: Handler) {
      reconnected.add(cb);
    },
    onclose(cb: Handler) {
      closed.add(cb);
    },
    offreconnecting(cb: Handler) {
      reconnecting.delete(cb);
    },
    offreconnected(cb: Handler) {
      reconnected.delete(cb);
    },
    offclose(cb: Handler) {
      closed.delete(cb);
    },
  };
}

/** Re-export the method names so tests don't hard-code strings. */
export { UPS_HUB_METHODS };

/** Convenience: cast to `HubConnection` for use with the hook. */
export function asHubConnection(fake: FakeHubConnection): HubConnection {
  return fake as unknown as HubConnection;
}
