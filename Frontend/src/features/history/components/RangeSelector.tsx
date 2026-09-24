/**
 * RangeSelector — MUST (frontend.md §11).
 *
 * Three presets (1h / 24h / 7d) + a "Custom" mode that exposes two
 * `<input type="datetime-local">` controls. Range commits on Apply,
 * not on every keystroke — we don't want React Query refetching per
 * character typed in a date field.
 */
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type RangePresetId = "1h" | "24h" | "7d" | "custom";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface RangeSelectorProps {
  value: DateRange;
  onChange: (next: DateRange) => void;
  className?: string;
}

interface Preset {
  id: Exclude<RangePresetId, "custom">;
  label: string;
  durationMs: number;
}

const PRESETS: Preset[] = [
  { id: "1h", label: "1 hour", durationMs: 60 * 60 * 1000 },
  { id: "24h", label: "24 hours", durationMs: 24 * 60 * 60 * 1000 },
  { id: "7d", label: "7 days", durationMs: 7 * 24 * 60 * 60 * 1000 },
];

/** Format a Date for `<input type="datetime-local">` (local-time, no Z). */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Validate + parse the local-input string; returns null on bad input. */
function fromLocalInput(raw: string): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function RangeSelector({ value, onChange, className }: RangeSelectorProps) {
  // Default preset is matched against the current `from/to` window. Falls
  // back to "24h" if neither preset matches (e.g. user manually picked
  // custom then flipped to 24h).
  const matched = (() => {
    const span = value.to.getTime() - value.from.getTime();
    return PRESETS.find((p) => Math.abs(span - p.durationMs) < 60_000)?.id ?? "custom";
  })();

  const [preset, setPreset] = useState<RangePresetId>(matched);

  const [customFrom, setCustomFrom] = useState(toLocalInput(value.from));
  const [customTo, setCustomTo] = useState(toLocalInput(value.to));
  const [customError, setCustomError] = useState<string | null>(null);

  // Keep custom inputs in sync when the parent resets the range externally
  // (e.g. after a successful preset switch).
  useEffect(() => {
    setCustomFrom(toLocalInput(value.from));
    setCustomTo(toLocalInput(value.to));
  }, [value.from, value.to]);

  function applyPreset(id: Exclude<RangePresetId, "custom">) {
    const duration = PRESETS.find((p) => p.id === id)?.durationMs ?? 24 * 60 * 60 * 1000;
    const to = new Date();
    const from = new Date(to.getTime() - duration);
    setPreset(id);
    onChange({ from, to });
  }

  function applyCustom() {
    const f = fromLocalInput(customFrom);
    const t = fromLocalInput(customTo);
    if (!f || !t) {
      setCustomError("Pick a valid from/to date.");
      return;
    }
    if (f.getTime() >= t.getTime()) {
      setCustomError("\"From\" must be earlier than \"To\".");
      return;
    }
    setCustomError(null);
    setPreset("custom");
    onChange({ from: f, to: t });
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Tabs
        value={preset}
        onValueChange={(v) => {
          if (v === "custom") {
            setPreset("custom");
          } else {
            applyPreset(v as Exclude<RangePresetId, "custom">);
          }
        }}
      >
        <TabsList>
          {PRESETS.map((p) => (
            <TabsTrigger key={p.id} value={p.id}>
              {p.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>
        <TabsContent value="custom">
          <div className="flex flex-wrap items-end gap-2 pt-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              From
              <input
                type="datetime-local"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              To
              <input
                type="datetime-local"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <Button variant="default" size="sm" onClick={applyCustom}>
              Apply
            </Button>
          </div>
          {customError && <p className="pt-1 text-xs text-danger">{customError}</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
