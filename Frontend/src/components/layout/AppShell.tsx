/**
 * AppShell — MUST (changesFrontend.md §4, Phase 3 layout migration).
 *
 * Layout (post-migration):
 *   ┌────────────┬───────────────────────────┐
 *   │            │  header (SidebarTrigger)  │
 *   │ AppSidebar ├───────────────────────────┤
 *   │            │  <Outlet/>  (page content)│
 *   └────────────┴───────────────────────────┘
 *
 * The shadcn `SidebarProvider` owns the open/collapsed state and exposes
 * `useSidebar()` to descendants (so `AppSidebar` and the header trigger
 * stay in sync). The provider also exposes `toggleSidebar()` for the
 * Ctrl/Cmd+B keyboard shortcut and persists the open state in a cookie.
 *
 * Migration notes:
 *   - ConnectionBadge is no longer mounted in a top-bar; it now lives in
 *     `UpsHeader` (per dashboard) and any future header slots can mount
 *     one independently. The old `TopBar.tsx` has been deleted.
 *   - `Toaster` (Sonner) is mounted here so `toast.*` works anywhere in
 *     the tree; DashboardPage uses it to surface reconnect events.
 */
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "./AppSidebar";
import { Toaster } from "@/components/ui/sonner";

export function AppShell() {
  return (
    <TooltipProvider delayDuration={150}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm font-medium text-muted-foreground">VoltSense</span>
          </header>
          <div className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </div>
        </SidebarInset>
        <Toaster richColors position="top-right" />
      </SidebarProvider>
    </TooltipProvider>
  );
}
