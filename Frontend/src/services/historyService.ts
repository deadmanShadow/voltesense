/**
 * History service — MUST (frontend.md §5).
 *
 * Single endpoint: `GET /api/ups/{deviceId}/history?from=...&to=...`
 *
 * Date serialisation is intentionally explicit (`toISOString()`) so that
 * local-timezone dev boxes and UTC containers always agree on the wire
 * representation. The backend stores everything in UTC.
 *
 * Range sanity (refuse reversed / absurd ranges) happens here *before*
 * the network call so we don't even hit the server for invalid input.
 */
import { apiClient } from "./apiClient";
import type { Telemetry } from "@/types/telemetry";

/** Max range the backend will accept anyway (defensive client-side cap). */
const MAX_RANGE_MS = 1000 * 60 * 60 * 24 * 365; // 1 year

export const historyService = {
  /**
   * Fetches telemetry samples for `deviceId` between `from` and `to`
   * (inclusive lower bound, exclusive upper bound, per backend convention).
   *
   * @throws RangeError if `from >= to`, or if the range exceeds 1 year.
   * @throws ApiError on transport / HTTP failures (caller should retry).
   */
  getHistory: (deviceId: string, from: Date, to: Date): Promise<Telemetry[]> => {
    if (!(from instanceof Date) || !(to instanceof Date) || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new RangeError("historyService.getHistory: from/to must be valid Dates");
    }
    if (from.getTime() >= to.getTime()) {
      throw new RangeError("historyService.getHistory: `from` must be strictly before `to`");
    }
    if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
      throw new RangeError("historyService.getHistory: range cannot exceed 1 year");
    }

    const qs = `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
    return apiClient.get<Telemetry[]>(`/api/ups/${encodeURIComponent(deviceId)}/history?${qs}`);
  },
} as const;
