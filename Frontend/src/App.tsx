import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardPage } from "@/features/dashboard/DashboardPage";

/**
 * Root component — wires the two top-level providers required by the app:
 *   1. QueryClientProvider — React Query for all server state (current UPS,
 *      history fetches). Configured once here, hooks consume via useQuery/useMutation.
 *   2. BrowserRouter — client-side routing for Dashboard / History / Settings / About.
 *
 * MUST — frontend.md §13 (Phase 12 will replace the `<main>` wrapper with the
 * proper `<AppShell />` + side nav; the route table below is the eventual shape).
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
        <main className="min-h-screen bg-background text-foreground">
          {/* Phase 12 will wrap this in <AppShell /> with sidebar nav. */}
          <Routes>
            <Route index element={<DashboardPage />} />
          </Routes>
        </main>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
