/**
 * SignalR connection factory — MUST (frontend.md §5).
 *
 * Exposes a *factory* (`createUpsHubConnection`) instead of a singleton so:
 *   - React Strict Mode's double effect can't connect twice to the same hub.
 *   - Tests can build isolated connections.
 *   - The hook layer (`useSignalRConnection`) can decide *when* to start/stop.
 *
 * Reconnect ladder — MUST (PRD §33):
 *   0ms, 2s, 5s, 10s, 30s.
 * If all five attempts fail, SignalR gives up. The UI surfaces this as a
 * permanent "Disconnected" badge; the user can reload the page to retry.
 *
 * Hub URL — relative to API base:
 *   {API_BASE_URL}/api/hubs/ups
 * (matches the ASP.NET convention used elsewhere in backend.md.)
 */
import * as signalR from "@microsoft/signalr";
import { API_BASE_URL } from "./apiClient";

/** Canonical hub method names. Keep these strings in sync with backend.md §33. */
export const UPS_HUB_METHODS = {
  TelemetryUpdated: "ups:telemetry-updated",
  Connected: "ups:connected",
  Disconnected: "ups:disconnected",
  StatusChanged: "ups:status-changed",
} as const;

export function createUpsHubConnection(): signalR.HubConnection {
  // Strip trailing slash from base, then append canonical hub path.
  const base = API_BASE_URL.replace(/\/+$/, "");
  const hubUrl = `${base}/api/hubs/ups`;

  return new signalR.HubConnectionBuilder()
    .withUrl(hubUrl)
    // MUST — PRD §33. SignalR will give up after these retries.
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();
}
