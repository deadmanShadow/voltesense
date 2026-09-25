/**
 * EmptyState — shadcn Alert + lucide icon (changesFrontend.md §5).
 *
 * Used everywhere we'd otherwise render an empty grid (no UPS attached,
 * no history yet, no telemetry available). Pure presentation.
 *
 * Migration notes:
 *   - The raw `<div>` from the previous version is replaced with a shadcn
 *     `Alert` (with a dashed border to suggest "nothing here").
 *   - A lucide `Inbox` icon is centered above the title for visual
 *     consistency with shadcn's empty-state convention.
 *   - The optional `action` slot is unchanged so existing call sites
 *     (e.g. "Retry" buttons on the dashboard) keep working without edits.
 *   - The optional `className` prop is still accepted (tests use it).
 */
import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Optional action slot (e.g. a "Retry" button). */
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center py-24", className)}
      role="status"
    >
      <Alert className="max-w-md text-center border-dashed">
        <Inbox className="mx-auto h-6 w-6" />
        <AlertTitle>{title}</AlertTitle>
        {description && <AlertDescription>{description}</AlertDescription>}
        {action && <div className="mt-3">{action}</div>}
      </Alert>
    </div>
  );
}
