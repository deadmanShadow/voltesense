/**
 * useLiveTelemetry tests — MUST (frontend.md §17).
 *
 * Drives the hook with a mocked `HubConnection` (see fakeHubConnection.ts)
 * and asserts that:
 *   1. Each of the four hub methods is registered on mount and
 *      unregistered on unmount (no leaks).
 *   2. telemetry-updated populates `telemetry` AND updates `status`.
 *   3. status-changed updates `status` independently of telemetry.
 *   4. connected / disconnected events flip `isUpsConnected`.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useLiveTelemetry } from "./useLiveTelemetry";
import type { HubConnection } from "@microsoft/signalr";
import type { Telemetry } from "@/types/telemetry";
import {
  asHubConnection,
  createFakeHubConnection,
  UPS_HUB_METHODS,
} from "@/test/fakeHubConnection";

const baseTelemetry: Telemetry = {
  timestamp: "2026-01-15T12:00:00Z",
  batteryCharge: 88,
  batteryVoltage: 13.6,
  loadPercentage: 35,
  inputVoltage: 230,
  outputVoltage: 230,
  runtimeSeconds: 600,
  temperature: 28,
  frequency: 50,
  power: 120,
  status: "Online",
};

describe("useLiveTelemetry", () => {
  it("starts in the empty state when no connection is supplied", () => {
    const { result } = renderHook(() => useLiveTelemetry(null));
    expect(result.current.telemetry).toBeNull();
    expect(result.current.isUpsConnected).toBe(false);
    expect(result.current.status).toBeNull();
  });

  it("registers all four hub handlers on mount", () => {
    const fake = createFakeHubConnection();
    renderHook(() => useLiveTelemetry(asHubConnection(fake)));
    expect(fake.listeners.get(UPS_HUB_METHODS.TelemetryUpdated)?.size ?? 0).toBe(1);
    expect(fake.listeners.get(UPS_HUB_METHODS.Connected)?.size ?? 0).toBe(1);
    expect(fake.listeners.get(UPS_HUB_METHODS.Disconnected)?.size ?? 0).toBe(1);
    expect(fake.listeners.get(UPS_HUB_METHODS.StatusChanged)?.size ?? 0).toBe(1);
  });

  it("unregisters all four hub handlers on unmount", () => {
    const fake = createFakeHubConnection();
    const { unmount } = renderHook(() => useLiveTelemetry(asHubConnection(fake)));
    unmount();
    for (const name of Object.values(UPS_HUB_METHODS)) {
      expect(fake.listeners.get(name)?.size ?? 0).toBe(0);
    }
  });

  it("populates telemetry AND status when telemetry-updated arrives", () => {
    const fake = createFakeHubConnection();
    const { result } = renderHook(() => useLiveTelemetry(asHubConnection(fake)));

    act(() => {
      fake.emit(UPS_HUB_METHODS.TelemetryUpdated, baseTelemetry);
    });

    expect(result.current.telemetry).toEqual(baseTelemetry);
    expect(result.current.status).toBe("Online");
  });

  it("updates status alone when status-changed arrives", () => {
    const fake = createFakeHubConnection();
    const { result } = renderHook(() => useLiveTelemetry(asHubConnection(fake)));

    act(() => {
      fake.emit(UPS_HUB_METHODS.TelemetryUpdated, baseTelemetry);
    });
    act(() => {
      fake.emit(UPS_HUB_METHODS.StatusChanged, "OnBattery");
    });

    expect(result.current.telemetry).toEqual(baseTelemetry); // unchanged
    expect(result.current.status).toBe("OnBattery");
  });

  it("flips isUpsConnected on connected/disconnected events", () => {
    const fake = createFakeHubConnection();
    const { result } = renderHook(() => useLiveTelemetry(asHubConnection(fake)));

    act(() => fake.emit(UPS_HUB_METHODS.Connected));
    expect(result.current.isUpsConnected).toBe(true);

    act(() => fake.emit(UPS_HUB_METHODS.Disconnected));
    expect(result.current.isUpsConnected).toBe(false);
  });

  it("does not throw if a hub event arrives without a connection (defensive null reset)", () => {
    const fake = createFakeHubConnection();
    type Props = { conn: HubConnection | null };
    const { rerender } = renderHook(
      ({ conn }: Props) => useLiveTelemetry(conn),
      { initialProps: { conn: asHubConnection(fake) } as Props },
    );

    // Re-render with null connection — should reset state, not throw.
    rerender({ conn: null });

    expect(() =>
      act(() => fake.emit(UPS_HUB_METHODS.TelemetryUpdated, baseTelemetry)),
    ).not.toThrow();
  });

  // Sanity: spies on console.warn are useful here because the live
  // telemetry hook only ever logs warnings from the *connection* layer
  // (Phase 5). The hook itself shouldn't warn.
  it("does not warn to console", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fake = createFakeHubConnection();
    renderHook(() => useLiveTelemetry(asHubConnection(fake)));
    act(() => fake.emit(UPS_HUB_METHODS.TelemetryUpdated, baseTelemetry));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});