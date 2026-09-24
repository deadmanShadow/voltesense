import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Root component — wires the two top-level providers required by the app:
 *   1. QueryClientProvider — React Query for all server state (current UPS,
 *      history fetches). Configured once here, hooks consume via useQuery/useMutation.
 *   2. BrowserRouter — client-side routing for Dashboard / History / Settings / About.
 *
 * MUST — frontend.md §13 (Phase 12).
 *
 * NOTE: Routing children (DashboardPage, etc.) are added in Phase 9.
 * For now we ship a minimal placeholder so the app compiles cleanly after
 * Phase 1–3. Subsequent phases will replace the placeholder `<main>` block
 * with the real <AppShell /> + route tree.
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Frontend.md §6 — never refetch just because the window regained focus.
      // SignalR is the source of truth for live telemetry; REST calls are
      // deliberately conservative.
      refetchOnWindowFocus: false,
      // One retry on transient errors is enough for a local-first LAN backend.
      retry: 1,
      // Data is "fresh" for 10 seconds — within that window we don't re-fetch
      // when navigating back to a page.
      staleTime: 10_000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Placeholder — replaced by <AppShell /> in Phase 12. */}
          <Route
            path="*"
            element={
              <main className="flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground">
                VoltSense — initializing…
              </main>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
