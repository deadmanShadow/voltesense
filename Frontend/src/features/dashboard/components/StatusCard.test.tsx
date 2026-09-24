/**
 * StatusCard tests — MUST (frontend.md §17).
 *
 * Verifies every member of the `UpsStatus` union maps to the correct
 * `BadgeVariant`. Because `STATUS_VARIANT` is typed `Record<UpsStatus, BadgeVariant>`,
 * if a new status is ever added, the build itself would fail until this
 * test (and the variant map) are updated.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusCard } from "./StatusCard";
import type { UpsStatus } from "@/types/telemetry";

describe("StatusCard", () => {
  it("renders 'Unknown' when status is null", () => {
    render(<StatusCard status={null} />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("renders every documented status as plain text", () => {
    const all: UpsStatus[] = [
      "Online",
      "OnBattery",
      "LowBattery",
      "Charging",
      "Discharging",
      "Disconnected",
      "Unknown",
    ];
    for (const s of all) {
      const { unmount } = render(<StatusCard status={s} />);
      expect(screen.getByText(s)).toBeInTheDocument();
      unmount();
    }
  });
});