/**
 * Low-level HTTP client — MUST (frontend.md §5).
 *
 * Design goals:
 *   - Typed `request<T>` returns deserialised JSON; throws `ApiError` on non-2xx.
 *   - Base URL reads Vite env (`VITE_API_BASE_URL`) and falls back to the local
 *     backend default `http://localhost:5279` so a fresh clone still works out
 *     of the box.
 *   - Default 10s timeout via AbortController; the backend is LAN-local, so any
 *     longer wait means something is wrong and we'd rather surface the failure
 *     fast and let React Query retry.
 *   - 204 No Content is represented as `undefined`, the canonical "void" return.
 *   - Validation errors (HTTP 400) are surfaced with the body intact so callers
 *     can show field-level messages.
 */

const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  "http://localhost:5279";

/** Default timeout for REST calls. Tuned for a LAN-local backend. */
const DEFAULT_TIMEOUT_MS = 10_000;

export interface ApiErrorBody {
  /** RFC 7807-style problem-details message, if the backend provided one. */
  message?: string;
  /** Optional field-level validation errors (kept as `unknown` to stay generic). */
  errors?: unknown;
  /** Anything the backend added we don't know about — kept for debugging. */
  [key: string]: unknown;
}

/**
 * Domain error thrown by every API call on a non-2xx response.
 *
 * Callers use `instanceof ApiError` + `.status` to discriminate:
 *   - 404 on `getCurrent()` means "No UPS detected" — see `useCurrentUps`.
 *   - 4xx generally = do not retry.
 *   - 5xx / network = retryable (handled in React Query's `retry`).
 */
export class ApiError extends Error {
  public override readonly name = "ApiError";

  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: ApiErrorBody,
  ) {
    super(message);
  }

  /** True for transport-level failures (no HTTP response at all). */
  public static isNetworkLike(err: unknown): err is ApiError {
    return err instanceof ApiError && (err.status === 0 || err.status >= 500);
  }

  /** True for client errors that should not be retried. */
  public static isClient(err: unknown): err is ApiError {
    return err instanceof ApiError && err.status >= 400 && err.status < 500;
  }
}

/** Options accepted by `request`. */
export interface RequestOptions extends Omit<RequestInit, "body" | "signal"> {
  body?: unknown;
  /** Per-call timeout override (ms). `0` disables the timeout. */
  timeoutMs?: number;
  /** External AbortSignal caller-supplied cancellation. */
  signal?: AbortSignal;
}

/**
 * Build a full URL relative to the API base. Validates input so a caller
 * that passes an absolute URL is rejected (defensive — keeps us pointing at
 * one origin and stops accidental credential leaks).
 */
function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    throw new Error(`apiClient: absolute URLs are not allowed (got "${path}")`);
  }
  const normalisedBase = API_BASE_URL.replace(/\/+$/, "");
  const normalisedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalisedBase}${normalisedPath}`;
}

/** Core request helper. JSON in, JSON out (or `undefined` for 204). */
async function request<T>(
  method: string,
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { body, headers, timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = opts;

  // Compose an internal AbortController so we can honour timeout AND
  // caller-supplied cancellation without one stomping the other.
  const internal = new AbortController();
  const timer =
    timeoutMs > 0 ? setTimeout(() => internal.abort(new Error("request-timeout")), timeoutMs) : null;

  const onExternalAbort = () => internal.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) internal.abort(signal.reason);
    else signal.addEventListener("abort", onExternalAbort, { once: true });
  }

  const init: RequestInit = {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(headers as Record<string, string> | undefined),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...rest,
    signal: internal.signal,
  };

  let response: Response;
  try {
    response = await fetch(buildUrl(path), init);
  } catch (err) {
    if (signal) signal.removeEventListener("abort", onExternalAbort);
    if (timer !== null) clearTimeout(timer);
    // Distinguish abort/cancel from real transport failure.
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(0, "Request aborted");
    }
    throw new ApiError(0, err instanceof Error ? err.message : "Network error");
  } finally {
    if (signal) signal.removeEventListener("abort", onExternalAbort);
    if (timer !== null) clearTimeout(timer);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    const errBody = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new ApiError(response.status, errBody.message ?? response.statusText, errBody);
  }

  // Some endpoints may legitimately return an empty 200; guard for that.
  const text = await response.text();
  if (text.length === 0) return undefined as T;
  return JSON.parse(text) as T;
}

/** Public, ergonomic wrapper. Only GET is needed for v1 (read-only app). */
export const apiClient = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T> =>
    request<T>("GET", path, opts),
};

export { API_BASE_URL };
