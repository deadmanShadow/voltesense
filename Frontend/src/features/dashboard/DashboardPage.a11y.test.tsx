/**
 * DashboardPage a11y smoke test — MUST (PRD §29 "accessible markup",
 * frontend.md §18 acceptance checklist).
 *
 * axe-core's WCAG 2.1 AA rules run against the rendered DOM for the
 * "Connected" state (the richest UI surface). A passing run means:
 *   - No critical / serious violations.
 *   - No missing form labels, button names, or ARIA roles.
 *
 * NOTE — axe is run with `regionRules` off because our pages don't
 * render a `<main>` directly (the AppShell wraps them) — that rule
 * fires noise against the DashboardPage render in isolation.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { makeQueryClient, QueryProvider } from "@/test/testUtils";
import type { UpsDevice } from "@/types/ups";

const mocks = vi.hoisted(() => ({
  useCurrentUpsResult: {} as Partial<{
    device: UpsDevice | null;
    isLoading: boolean;
    isNoDevice: boolean;
    error: Error | null;
    refetch: () => void;
    dataUpdatedAt: number;
  }>,
}));

vi.mock("@/hooks/useSignalRConnection", () => ({
  useSignalRConnection: () => ({
    connection: null,
    state: "connected",
    getConnection: () => null,
  }),
}));

vi.mock("@/features/ups/hooks/useCurrentUps", () => ({
  useCurrentUps: () => mocks.useCurrentUpsResult,
}));

vi.mock("@/features/dashboard/hooks/useLiveTelemetry", () => ({
  useLiveTelemetry: () => ({
    telemetry: null,
    isUpsConnected: true,
    status: "Online",
  }),
}));

import { DashboardPage } from "./DashboardPage";

const fakeDevice: UpsDevice = {
  id: "dev-1",
  manufacturer: "APC",
  model: "Back-UPS 1500",
  connectionType: "USB",
  firmwareVersion: "03.1",
  lastSeenAt: "2026-01-15T12:00:00Z",
  isActive: true,
};

beforeEach(() => {
  mocks.useCurrentUpsResult = {
    device: fakeDevice,
    isLoading: false,
    isNoDevice: false,
    error: null,
    refetch: () => undefined,
    dataUpdatedAt: 0,
  };
});

describe("DashboardPage accessibility", () => {
  it("has no critical or serious axe violations in the connected state", async () => {
    const client = makeQueryClient();
    const { container } = render(
      <QueryProvider client={client}>
        <DashboardPage />
      </QueryProvider>,
    );

    const results = await axe(container, {
      rules: {
        // Wrapping in <main> happens at the AppShell level, not in
        // DashboardPage itself, so this rule fires noise in unit tests.
        region: { enabled: false },
      },
    });

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
  });
});
