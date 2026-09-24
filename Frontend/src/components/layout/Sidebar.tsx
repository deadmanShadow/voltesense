/**
 * Sidebar — MUST (frontend.md §13).
 *
 * Static nav with four routes. `NavLink` does the active-route work for
 * us; styling is classname-driven so Tailwind can tree-shake.
 *
 * Accessibility: rendered as `<nav aria-label="Primary">` so screen
 * reader users can skip it.
 */
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  /** Lowercase route key used as the Iconless visual cue (a coloured dot). */
  hint: "dashboard" | "history" | "settings" | "about";
}

const ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", hint: "dashboard" },
  { to: "/history", label: "History", hint: "history" },
  { to: "/settings", label: "Settings", hint: "settings" },
  { to: "/about", label: "About", hint: "about" },
];

const HINT_COLOR: Record<NavItem["hint"], string> = {
  dashboard: "bg-primary",
  history: "bg-warning",
  settings: "bg-muted-foreground",
  about: "bg-success",
};

export function Sidebar() {
  return (
    <nav
      aria-label="Primary"
      className="flex w-48 flex-col gap-1 border-r border-border bg-card p-4"
    >
      <div className="mb-4 px-2 text-sm font-semibold tracking-wide text-foreground">
        VoltSense
      </div>
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isActive ? "bg-primary-foreground" : HINT_COLOR[item.hint],
                )}
              />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
