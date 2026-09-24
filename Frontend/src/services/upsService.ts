/**
 * UPS service — MUST (frontend.md §5).
 *
 * Thin layer over `apiClient` for the three endpoints the backend exposes
 * for UPS device metadata. Strict typing: no `any`, no implicit returns.
 *
 * Endpoints (mirror Backend.md):
 *   GET /api/ups/current   → the currently-monitored device (404 if none)
 *   GET /api/ups           → every device the backend has ever seen
 *   GET /api/ups/{id}      → a single device by stable id
 *
 * Each method returns a fresh `Promise` on every call so React Query can
 * own the caching layer; do not memoise here.
 */
import { apiClient } from "./apiClient";
import type { UpsDevice } from "@/types/ups";

export const upsService = {
  /**
   * Returns the currently-monitored UPS device.
   *
   * Throws `ApiError(404, ...)` when no UPS is currently attached — callers
   * (most importantly `useCurrentUps`) must handle that case as a normal
   * "no device" state rather than an error.
   */
  getCurrent: (): Promise<UpsDevice> => apiClient.get<UpsDevice>("/api/ups/current"),

  /** Lists every UPS the backend has ever observed. */
  getAll: (): Promise<UpsDevice[]> => apiClient.get<UpsDevice[]>("/api/ups"),

  /** Fetches a single UPS by stable id. */
  getById: (id: string): Promise<UpsDevice> => apiClient.get<UpsDevice>(`/api/ups/${id}`),
} as const;
