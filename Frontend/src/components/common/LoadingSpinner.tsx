/**
 * LoadingSpinner — small spinner for inline loading indicators.
 *
 * Used by buttons (refetch action, range selector "apply" button) and
 * by full-page states that aren't skeletons (the Settings page during
 * a config fetch, for example).
 */
import { cn } from "@/lib/utils";

export interface LoadingSpinnerProps {
  className?: string;
  /** a11y label for the spinner. */
  label?: string;
}

export function LoadingSpinner({ className, label = "Loading" }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)}
    >
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
