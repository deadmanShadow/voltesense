/**
 * Select — shadcn/ui primitive (native <select> variant).
 *
 * VoltSense uses simple selects for the history range picker. The native
 * <select> is keyboard- and screen-reader-accessible out of the box and
 * is the most accessible choice here, so we wrap rather than reimplement.
 *
 * MUST — frontend.md §2 (Phase 2 includes `select` in the shadcn add list).
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
