/**
 * useCurrentUps — MUST (frontend.md §7).
 *
 * Wraps `upsService.getCurrent()` in React Query with:
 *   - Light polling fallback (30s) — SignalR is the live source of truth,
 *     but this query keeps the *device metadata* (manufacturer, model,
 *     firmware) fresh if the backend rotates device info.
 *   - 404-aware retry: a 404 means "no UPS attached yet" — that's a normal
 *     state for a freshly-booted box without a UPS, so we do NOT retry
 *     and surface a discriminated `isNoDevice` flag for the UI.
 *   - Network-level retries (status 0 / 5xx) are still attempted up to 2 times.
 *
 * Returned shape is intentionally narrow — consumers should not need to
 * touch `data`/`error`/`isLoading` triples to render the four UI states
 * listed in frontend.md §14 (Phase 14).
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { upsService } from "@/services/upsService";
import { ApiError } from "@/services/apiClient";
import type { UpsDevice } from "@/types/ups";

export interface UseCurrentUpsResult {
  /** The currently-monitored UPS, or null if the backend says "no device". */
  device: UpsDevice | null;
  /** True while the initial fetch is in-flight (skeleton state). */
  isLoading: boolean;
  /** True when the backend has confirmed "no UPS detected" (HTTP 404). */
  isNoDevice: boolean;
  /** Other (non-404) error — transport failure / 5xx. */
  error: Error | null;
  /** Imperative refetch — used by polling fallback and manual refresh. */
  refetch: UseQueryResult<UpsDevice, Error>["refetch"];
  /** Last successful fetch time (epoch ms) — useful for status badges. */
  dataUpdatedAt: number;
}

export function useCurrentUps(): UseCurrentUpsResult {
  const query = useQuery<UpsDevice, Error>({
    queryKey: ["ups", "current"],
    queryFn: upsService.getCurrent,
    retry: (failureCount, error) => {
      // 404 = "No UPS detected" — the backend's normal "device not plugged
      // in" answer. Retry would spam logs forever; instead we surface it
      // through `isNoDevice`.
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 2;
    },
    // Light fallback polling — SignalR is the live channel, but a periodic
    // refresh of device metadata is cheap and self-healing.
    refetchInterval: 30_000,
    // Don't re-fetch when navigating back to a tab; keep what we have.
    refetchOnWindowFocus: false,
  });

  const isNoDevice = query.error instanceof ApiError && query.error.status === 404;

  return {
    device: query.data ?? null,
    isLoading: query.isLoading,
    isNoDevice,
    error: isNoDevice ? null : query.error,
    refetch: query.refetch,
    dataUpdatedAt: query.dataUpdatedAt,
  };
}
