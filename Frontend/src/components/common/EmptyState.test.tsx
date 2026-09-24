/**
 * EmptyState tests — MUST (frontend.md §17).
 *
 * Confirms the component renders the title/description and an optional
 * action slot. Also exercises the no-description / no-action paths.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("renders the description when provided", () => {
    render(<EmptyState title="t" description="d" />);
    expect(screen.getByText("d")).toBeInTheDocument();
  });

  it("renders the action slot", () => {
    render(
      <EmptyState
        title="t"
        action={<button type="button">Retry</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("does not crash when description and action are omitted", () => {
    expect(() => render(<EmptyState title="t" />)).not.toThrow();
  });
});