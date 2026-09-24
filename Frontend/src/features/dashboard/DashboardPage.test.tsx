/**
 * DashboardPage tests — MUST (frontend.md §17).
 *
 * Verifies the four UI states from frontend.md §14:
 *
 *   1. Searching  → skeleton grid (initial fetch in-flight).
 *   2. Unsupported (404) → "No UPS detected" empty state.
 *   3. Error (non-404) → "Unable to read UPS telemetry" empty state.
 *   4. Connected → cards render with the loaded device's identity.
 *
 * Approach: we mock `useSignalRConnection` (to skip the real SignalR
 * lifecycle) and `useCurrentUps` (to inject the four states directly
 * without hitting the network).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { makeQueryClient, QueryProvider } from "@/test/testUtils";
import { ApiError } from "@/services/apiClient";
import type { UpsDevice } from "@/types/ups";

// --- Hoisted mocks ---------------------------------------------------------
//
// vi.hoisted runs BEFORE vi.mock factories, so the mocks object below is
// visible to both. We then mutate it in beforeEach to swap state.
const mocks = vi.hoisted(() => ({
  signalRConnection: null as null,
  signalRState: "connected" as
    | "connecting"
    | "connected"
    | "reconnecting"
    | "disconnected",
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
    connection: mocks.signalRConnection,
    state: mocks.signalRState,
    getConnection: () => mocks.signalRConnection,
  }),
}));

vi.mock("@/features/ups/hooks/useCurrentUps", () => ({
  useCurrentUps: () => mocks.useCurrentUpsResult,
}));

// useLiveTelemetry just listens to a HubConnection. With
// signalRConnection = null it returns the empty initial state, which is
// exactly what we want for "no telemetry yet" tests.
vi.mock("@/features/dashboard/hooks/useLiveTelemetry", () => ({
  useLiveTelemetry: () => ({
    telemetry: null,
    isUpsConnected: false,
    status: null,
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

function renderWithClient(ui: React.ReactElement) {
  const client = makeQueryClient();
  return render(<QueryProvider client={client}>{ui}</QueryProvider>);
}

beforeEach(() => {
  mocks.signalRConnection = null;
  mocks.signalRState = "connected";
  mocks.useCurrentUpsResult = {};
});

describe("DashboardPage — four UI states", () => {
  it("renders skeleton tiles while the initial fetch is in flight (Searching)", () => {
    mocks.useCurrentUpsResult = {
      device: null,
      isLoading: true,
      isNoDevice: false,
      error: null,
      refetch: () => undefined,
      dataUpdatedAt: 0,
    };

    const { container } = renderWithClient(<DashboardPage />);
    // At least one animated-pulse div exists (Skeleton renders them).
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    // The container exposes aria-busy so screen readers announce the
    // loading state.
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    // Crucially: no cards rendered yet.
    expect(screen.queryByText("Battery")).not.toBeInTheDocument();
  });

  it("renders the 'No UPS detected' EmptyState on 404 (Unsupported)", async () => {
    mocks.useCurrentUpsResult = {
      device: null,
      isLoading: false,
      isNoDevice: true,
      error: null,
      refetch: () => undefined,
      dataUpdatedAt: 0,
    };

    renderWithClient(<DashboardPage />);
    // Heading text is unique on the page.
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "No UPS detected" }),
      ).toBeInTheDocument();
    });
  });

  it("renders the 'Unable to read UPS telemetry' EmptyState on transport error (takes precedence over no-device)", async () => {
    // Real-world scenario: the backend is unreachable. The query never
    // resolves, so `device` is null AND `error` is set. The error branch
    // MUST fire before the no-device branch — otherwise the user would see
    // "Plug in a UPS" when the real problem is "the backend isn't running".
    mocks.useCurrentUpsResult = {
      device: null,
      isLoading: false,
      isNoDevice: false,
      error: new Error("Connection refused"),
      refetch: () => undefined,
      dataUpdatedAt: 0,
    };

    renderWithClient(<DashboardPage />);
    await waitFor(() => {
      expect(
        screen.getByText(/Unable to read UPS telemetry/i),
      ).toBeInTheDocument();
    });
    // Crucially, the no-device message must NOT also be present.
    expect(screen.queryByText("No UPS detected")).not.toBeInTheDocument();
  });

  it("shows a network-specific hint when the failure looks like a network outage", async () => {
    // apiClient throws `new ApiError(0, ...)` for transport-level failures;
    // status 0 makes ApiError.isNetworkLike return true.
    const networkErr = new ApiError(0, "fetch failed");
    mocks.useCurrentUpsResult = {
      device: null,
      isLoading: false,
      isNoDevice: false,
      error: networkErr,
      refetch: () => undefined,
      dataUpdatedAt: 0,
    };

    renderWithClient(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/couldn't reach the backend/i)).toBeInTheDocument();
    });
  });

  it("renders the card grid when a device is loaded (Connected)", async () => {
    mocks.useCurrentUpsResult = {
      device: fakeDevice,
      isLoading: false,
      isNoDevice: false,
      error: null,
      refetch: () => undefined,
      dataUpdatedAt: 0,
    };

    renderWithClient(<DashboardPage />);

    // Manufacturer "APC" appears in BOTH the header <h1> AND the
    // DeviceInfoCard. Assert at least one match rather than exactly one.
    await waitFor(() => {
      expect(screen.getAllByText("APC").length).toBeGreaterThanOrEqual(1);
    });

    // The grid of cards (each CardTitle is unique).
    expect(screen.getByText("Battery")).toBeInTheDocument();
    expect(screen.getByText("UPS Status")).toBeInTheDocument();
    expect(screen.getByText("Load")).toBeInTheDocument();
    expect(screen.getByText("Input Voltage")).toBeInTheDocument();
    expect(screen.getByText("Output Voltage")).toBeInTheDocument();
    expect(screen.getByText("Estimated Runtime")).toBeInTheDocument();
    expect(screen.getByText("Device")).toBeInTheDocument();
  });
});
