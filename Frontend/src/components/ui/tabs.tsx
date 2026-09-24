/**
 * Tabs — shadcn/ui primitive (Radix UI under the hood).
 *
 * MUST — frontend.md §2 (Phase 2 includes `tabs` in the shadcn add list).
 * We use Radix's primitives where they exist; here we ship a fully-typed
 * wrapper with no Radix runtime dep — Tabs in VoltSense are used for the
 * chart-switcher in the History page and the preset selector in the range
 * picker. Both cases can be modelled as a simple controlled/uncontrolled
 * state machine without keyboard navigation complexity beyond the basics.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs(component: string): TabsContextValue {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error(`<${component}> must be rendered inside <Tabs>.`);
  return ctx;
}

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

export function Tabs({ value, defaultValue, onValueChange, className, children }: TabsProps) {
  const [uncontrolled, setUncontrolled] = React.useState<string>(defaultValue ?? "");
  const current = value ?? uncontrolled;
  const setValue = React.useCallback(
    (next: string) => {
      if (value === undefined) setUncontrolled(next);
      onValueChange?.(next);
    },
    [value, onValueChange],
  );

  // Default to first TabsTrigger if no value/defaultValue provided.
  React.useEffect(() => {
    if (current === "" && typeof window !== "undefined") {
      const first = document.querySelector<HTMLElement>("[data-tabs-trigger]");
      if (first?.dataset.value) setValue(first.dataset.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ctx = React.useMemo(() => ({ value: current, onValueChange: setValue }), [current, setValue]);
  return (
    <TabsContext.Provider value={ctx}>
      <div className={cn("flex flex-col gap-2", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex h-9 items-center justify-start gap-1 rounded-md bg-muted p-1 text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(function TabsTrigger(
  { value, className, ...props },
  ref,
) {
  const ctx = useTabs("TabsTrigger");
  const active = ctx.value === value;
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={active}
      data-state={active ? "active" : "inactive"}
      data-tabs-trigger=""
      data-value={value}
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-xs font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        active
          ? "bg-background text-foreground shadow"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
});

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const ctx = useTabs("TabsContent");
  if (ctx.value !== value) return null;
  return (
    <div role="tabpanel" className={cn("focus-visible:outline-none", className)} {...props}>
      {children}
    </div>
  );
}
