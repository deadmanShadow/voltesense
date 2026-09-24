/**
 * Progress — shadcn/ui primitive.
 *
 * Simple accessible progress bar built on `role="progressbar"`. The
 * `value` and `max` are exposed via aria attributes so screen readers
 * announce the percentage.
 *
 * MUST — frontend.md §3.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0..max */
  value?: number | null;
  /** Defaults to 100. */
  max?: number;
  /** Accessible label (required for non-decorative bars). */
  "aria-label"?: string;
}

/**
 * The bar clamps to [0, max] internally — we never want a negative or
 * 200% bar even if the upstream sensor glitches.
 */
export function Progress({ className, value, max = 100, ...props }: ProgressProps) {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const clamped = Math.min(max, Math.max(0, numeric));
  const pct = max > 0 ? (clamped / max) * 100 : 0;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Number.isFinite(value ?? NaN) ? clamped : undefined}
      aria-label={props["aria-label"]}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      <div
        className="h-full bg-primary transition-[width] duration-300 ease-in-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
