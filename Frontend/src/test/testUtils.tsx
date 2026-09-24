/**
 * Test helpers for components that depend on React Query + (optionally)
 * a SignalR connection.
 *
 * `withQueryClient` — wraps `children` in a fresh `QueryClientProvider`
 * whose client has `retry: false` so a single 404 doesn't get retried
 * mid-test.
 */
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";

export function withQueryClient(children: ReactNode): RenderResult {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  );
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  });
}

/** Wrap children in a QueryClientProvider with a pre-built client. */
export function QueryProvider({
  client,
  children,
}: {
  client: QueryClient;
  children: ReactNode;
}) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// Re-export RenderOptions so test files can spread their own `render`
// calls without us re-importing from RTL.
export type { RenderOptions };
