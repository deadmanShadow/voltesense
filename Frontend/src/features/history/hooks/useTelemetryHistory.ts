/**
 * useTelemetryHistory — MUST (frontend.md §7).
 *
 * Range-aware query for `historyService.getHistory`.
 *
 *  - `enabled` is `false` whenever `deviceId` is missing (or the range is
 *    invalid) so React Query doesn't fire a doomed request.
 *  - `staleTime: Infinity` because history within a fixed window is an
 *    *immutable* fact — once fetched, it never changes; the only way to get
 *    new data is for the user to widen the window or click "refresh".
 *  - Query key includes both ISO timestamps so different windows cache
 *    separately (no cross-contamination of cached fetches).
 *
 * Validation: `historyService.getHistory` throws `RangeError` for bad
 * ranges; we surface that as `error` for the page to render an inline
 * message rather than letting React Query retry it forever.
 */
import { useMemo } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { historyService } from "@/services/historyService";
import type { Telemetry } from "@/types/telemetry";

export interface UseTelemetryHistoryArgs {
  deviceId: string | undefined;
  from: Date;
  to: Date;
}

export interface UseTelemetryHistoryResult {
  data: Telemetry[] | undefined;
  isLoading: boolean;
  error: Error | null;
  isValidRange: boolean;
  refetch: UseQueryResult<Telemetry[], Error>["refetch"];
}

function isFiniteDate(d: Date): boolean {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

function validateRange(from: Date, to: Date): boolean {
  if (!isFiniteDate(from) || !isFiniteDate(to)) return false;
  return from.getTime() < to.getTime();
}

export function useTelemetryHistory({
  deviceId,
  from,
  to,
}: UseTelemetryHistoryArgs): UseTelemetryHistoryResult {
  // Memoised query key so identical inputs across re-renders hit React Query's
  // structural-sharing cache instead of invalidating it.
  const queryKey = useMemo(
    () => ["ups", deviceId ?? null, "history", from.toISOString(), to.toISOString()] as const,
    [deviceId, from, to],
  );

  const isValidRange = validateRange(from, to);

  const query = useQuery<Telemetry[], Error>({
    queryKey,
    queryFn: () => historyService.getHistory(deviceId as string, from, to),
    enabled: Boolean(deviceId) && isValidRange,
    staleTime: Infinity, // history is a fact-of-the-past; no auto-refetch.
    refetchOnWindowFocus: false,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: isValidRange ? query.error : new RangeError("Invalid history range"),
    isValidRange,
    refetch: query.refetch,
  };
}
