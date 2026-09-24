/**
 * TopBar — top-right status indicator.
 *
 * The dashboard already has its own ConnectionBadge, but every other page
 * (History, Settings, About) benefits from a global "we're still talking
 * to the backend" indicator. Renders in the AppShell header so it
 * survives route changes without re-mounting.
 */
import { ConnectionBadge } from "@/components/common/ConnectionBadge";
import { useSignalRConnection } from "@/hooks/useSignalRConnection";

export function TopBar() {
  const { state } = useSignalRConnection();
  const isConnected = state === "connected";
  const labelByState: Record<typeof state, string> = {
    connected: "Connected",
    connecting: "Connecting…",
    reconnecting: "Reconnecting…",
    disconnected: "Disconnected",
  };

  return (
    <div className="flex items-center justify-end border-b border-border bg-card px-4 py-2">
      <ConnectionBadge isConnected={isConnected} label={labelByState[state]} />
    </div>
  );
}
