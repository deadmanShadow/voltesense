/**
 * EmptyState — generic "nothing to show" panel.
 *
 * Used everywhere we'd otherwise render an empty grid (no UPS attached,
 * no history yet, no telemetry available). MUST (frontend.md §9).
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Optional action slot (e.g. a "Retry" button). */
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card/30 px-6 py-16 text-center",
        className,
      )}
      role="status"
    >
      <h2 className="text-base font-medium text-foreground">{title}</h2>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
