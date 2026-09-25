/**
 * Toaster (Sonner) — shadcn/ui toast primitive (Sonner under the hood).
 *
 * Mounted once in AppShell so any descendant component can call
 * `toast.success(...)` / `toast.warning(...)` / `toast.error(...)` and have
 * it appear in the top-right. Used by DashboardPage to surface connection
 * state changes ("Reconnecting to VoltSense backend…" / "Reconnected").
 *
 * MUST — changesFrontend.md §1 (Phase 1 primitive list).
 */
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
