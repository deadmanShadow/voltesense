/**
 * Badge — shadcn/ui primitive.
 *
 * Three visual variants used by the dashboard:
 *   - `default`  → "Online" / "Charging"  (success-tinted via className)
 *   - `secondary`→ neutral state ("OnBattery", "Discharging")
 *   - `destructive`→ danger states ("LowBattery", "Disconnected")
 *
 * Plus a `success` / `warning` semantic variant we wire to our tailwind
 * palette (added in Phase 2).
 *
 * MUST — frontend.md §3.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "secondary" | "destructive" | "success" | "warning" | "outline";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  success: "bg-success text-success-foreground hover:bg-success/90",
  warning: "bg-warning text-warning-foreground hover:bg-warning/90",
  outline: "border border-border text-foreground",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}
