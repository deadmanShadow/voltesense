/**
 * Separator — shadcn/ui primitive.
 *
 * Lightweight horizontal rule. Used by `DeviceInfoCard` to separate the
 * fields into a tidy key/value list.
 *
 * MUST — frontend.md §3.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical" }
>(function Separator({ className, orientation = "horizontal", ...props }, ref) {
  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
});
