import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * `cn()` — shadcn/ui's standard class-name composer.
 *
 * Combines `clsx` (conditional class names) with `twMerge` (resolves Tailwind
 * conflicts so the last class wins). This is the only utility every component
 * in the project should use to merge class names — never concatenate strings.
 *
 * MUST — frontend.md §3.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
