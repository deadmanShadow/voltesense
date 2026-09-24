/**
 * Root component — MUST (frontend.md §13, Phase 12).
 *
 * Top-level providers + the full route tree:
 *   - QueryClientProvider — React Query
 *   - BrowserRouter        — react-router
 *   - AppShell layout      — sidebar nav + top bar (Persistent across routes)
 *   - Routes:
 *       /         → DashboardPage
 *       /history  → HistoryPage
 *       /settings → SettingsPage
 *       /about    → AboutPage
 *       *         → EmptyState "Not found"
 *
 * The route table matches the doc exactly.
 */
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { HistoryPage } from "@/features/history/HistoryPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { AboutPage } from "@/pages/AboutPage";
import { EmptyState } from "@/components/common/EmptyState";

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

function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="The page you tried to open does not exist. Use the sidebar to navigate."
    />
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
