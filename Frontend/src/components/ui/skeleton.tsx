/**
 * Skeleton — shadcn/ui primitive.
 *
 * Pulsing placeholder for loading states. The `DashboardPage` renders
 * six of these in a 4-col grid while `useCurrentUps` is fetching the
 * initial device metadata (Phase 14: "Searching" state).
 *
 * MUST — frontend.md §3.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-hidden="true"
      {...props}
    />
  );
}
