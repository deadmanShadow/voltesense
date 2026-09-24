/**
 * BatteryCard tests — MUST (frontend.md §17).
 *
 *   1. Null props do not crash and render "Unavailable".
 *   2. Below-threshold (≤20%) charge flips to the danger palette so the
 *      dashboard warns the user.
 *   3. The progress bar's aria attributes reflect the current value.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BatteryCard } from "./BatteryCard";

describe("BatteryCard", () => {
  it("renders without crashing when chargePercent is null", () => {
    render(<BatteryCard chargePercent={null} status={null} />);
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });

  it("renders the formatted percent when chargePercent is provided", () => {
    render(<BatteryCard chargePercent={87} status="Online" />);
    expect(screen.getByText("87%")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("applies the danger palette at or below 20% charge", () => {
    render(<BatteryCard chargePercent={18} status="LowBattery" />);
    const percentage = screen.getByText("18%");
    expect(percentage.className).toMatch(/text-danger/);
  });

  it("does NOT apply the danger palette above 20%", () => {
    render(<BatteryCard chargePercent={75} status="Online" />);
    const percentage = screen.getByText("75%");
    expect(percentage.className).not.toMatch(/text-danger/);
  });

  it("exposes aria-valuenow on the progress bar", () => {
    render(<BatteryCard chargePercent={50} status="Online" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "50");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });
});