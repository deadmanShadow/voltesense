/**
 * AppShell — MUST (frontend.md §13).
 *
 * Layout:
 *   ┌────────────┬───────────────────────────┐
 *   │            │  TopBar (connection)      │
 *   │  Sidebar   ├───────────────────────────┤
 *   │            │  <Outlet/> (page content) │
 *   └────────────┴───────────────────────────┘
 *
 * - Sidebar is fixed-width and visible at md+ breakpoint; the page content
 *   scrolls independently. On narrow screens the sidebar collapses out and
 *   pages take the full width — no hamburger drawer (PRD §29: minimal).
 */
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:block">
          <Sidebar />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
