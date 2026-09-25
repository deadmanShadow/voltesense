/**
 * AppSidebar — shadcn `Sidebar` block (changesFrontend.md §4, Phase 3).
 *
 * Replaces the old hand-rolled `<nav>` sidebar with the collapsible
 * shadcn primitive set:
 *   - `Sidebar` (collapsible="icon" — collapses to a 3rem rail)
 *   - `SidebarHeader` for the brand
 *   - `SidebarMenuButton` + `NavLink` per route, with an icon and
 *     tooltip that auto-shows when the sidebar is collapsed.
 *
 * Active-route styling is driven by `isActive` from `NavLink` rather than
 * the previous `bg-primary`/`text-primary-foreground` swap; we let
 * `SidebarMenuButton` apply the `data-active=true` styles and only
 * override the text colour so the icon stays consistent.
 */
import { NavLink } from "react-router-dom";
import { LayoutDashboard, History, Settings, Info, Zap } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface NavLinkDef {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end: boolean;
}

const LINKS: NavLinkDef[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/history", label: "History", icon: History, end: false },
  { to: "/settings", label: "Settings", icon: Settings, end: false },
  { to: "/about", label: "About", icon: Info, end: false },
];

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Zap className="h-5 w-5 text-primary" />
          <span className="font-semibold group-data-[collapsible=icon]:hidden">
            VoltSense
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Monitoring</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {LINKS.map((link) => (
                <SidebarMenuItem key={link.to}>
                  <SidebarMenuButton asChild tooltip={link.label}>
                    <NavLink
                      to={link.to}
                      end={link.end}
                      className={({ isActive }) =>
                        isActive ? "font-medium text-sidebar-primary" : undefined
                      }
                    >
                      <link.icon />
                      <span>{link.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
