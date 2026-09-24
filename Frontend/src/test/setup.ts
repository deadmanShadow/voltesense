/**
 * Vitest setup — runs before every test file.
 *
 *   - Imports @testing-library/jest-dom for `toBeInTheDocument()` etc.
 *   - Stubs `matchMedia`, `ResizeObserver`, and `IntersectionObserver`
 *     because jsdom doesn't ship them and Recharts/Tailwind reach for
 *     them at module-evaluation time.
 *   - Polyfills `crypto.randomUUID` (jsdom 25 already has it, but some
 *     React bits still ask).
 *   - Sets `navigator.language` so `formatRelativeTime` picks a stable
 *     locale in tests rather than depending on the runner's environment.
 *
 * MUST — frontend.md §17.
 */
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

beforeAll(() => {
  // matchMedia — Tailwind's responsive variants don't call it at runtime
  // but Recharts' ResponsiveContainer calls it during mount.
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }

  // ResizeObserver — ResponsiveContainer measures its parent.
  if (!window.ResizeObserver) {
    class ResizeObserverStub {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    Object.defineProperty(window, "ResizeObserver", {
      writable: true,
      value: ResizeObserverStub,
    });
  }

  // IntersectionObserver — not used by us, but stubbed defensively.
  if (!window.IntersectionObserver) {
    class IntersectionObserverStub {
      root = null;
      rootMargin = "";
      thresholds: ReadonlyArray<number> = [];
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = vi.fn().mockReturnValue([]);
    }
    Object.defineProperty(window, "IntersectionObserver", {
      writable: true,
      value: IntersectionObserverStub,
    });
  }

  // Stable locale so tests are deterministic regardless of host.
  Object.defineProperty(navigator, "language", {
    configurable: true,
    value: "en-US",
  });
});

// Suppress noisy "ReactDOM.render is no longer supported" warnings from
// Recharts internals during the (limited) renders our tests perform.
// We can't fix Recharts; we can avoid the console flood in CI logs.
const originalError = console.error;
console.error = (...args: unknown[]) => {
  const message = String(args[0] ?? "");
  if (
    message.includes("not wrapped in act(") ||
    message.includes("ReactDOMTestUtils.act")
  ) {
    return;
  }
  originalError(...args);
};
