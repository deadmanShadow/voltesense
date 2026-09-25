/**
 * LoadingSpinner — skeleton-based loading state (changesFrontend.md §5).
 *
 * Migration notes:
 *   - The previous animated spinner (`LoadingSpinner`) is replaced with a
 *     pure `CardGridSkeleton` helper. VoltSense uses the skeleton pattern
 *     for every loading surface today (dashboard grid, settings panel,
 *     history charts) so the spinner was a duplicate of the Skeleton
 *     primitive's job.
 *   - The old `LoadingSpinner` is kept as a thin re-export so any
 *     downstream caller still importing it gets a no-deprecation warning.
 */
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Grid of skeleton tiles, used for dashboard-style loading states. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-lg" />
      ))}
    </div>
  );
}

/**
 * Inline spinner — kept for any future inline button/row loading
 * indicator. Renders an accessible spinner built from the same Skeleton
 * primitive pattern so the visual language stays consistent.
 */
export interface LoadingSpinnerProps {
  className?: string;
  /** a11y label for the spinner. */
  label?: string;
}

export function LoadingSpinner({ className, label = "Loading" }: LoadingSpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)}
    >
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
