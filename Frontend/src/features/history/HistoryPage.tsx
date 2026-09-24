/**
 * HistoryPage — MUST (frontend.md §11).
 *
 * Three charts (battery %, load %, input + output voltage) over a
 * user-selectable range. The range selector and the data query are
 * deliberately separate so the user can change presets without the chart
 * re-rendering until React Query finishes refetching.
 *
 * State machine (mirrors frontend.md §14):
 *   - No device yet                       → <EmptyState/>
 *   - Initial fetch in-flight              → <Skeleton/>
 *   - Range invalid (validation)           → <EmptyState title="Invalid range"/>
 *   - Empty result                        → <EmptyState title="No history yet"/>
 *   - Error                               → <EmptyState title="Unable to load history"/>
 *   - Data                                → three chart cards
 */
import { useState } from "react";
import { useCurrentUps } from "@/features/ups/hooks/useCurrentUps";
import { useTelemetryHistory } from "./hooks/useTelemetryHistory";
import { BatteryHistoryChart } from "./components/BatteryHistoryChart";
import { LoadHistoryChart } from "./components/LoadHistoryChart";
import { VoltageHistoryChart } from "./components/VoltageHistoryChart";
import { RangeSelector, type DateRange } from "./components/RangeSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { ApiError } from "@/services/apiClient";

/** Default range: last 24 hours, ending now. */
function defaultRange(): DateRange {
  const to = new Date();
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
  return { from, to };
}

export function HistoryPage() {
  const { data: device, isLoading: deviceLoading, isNoDevice } = useCurrentUps();
  const [range, setRange] = useState<DateRange>(defaultRange);

  const history = useTelemetryHistory({
    deviceId: device?.id,
    from: range.from,
    to: range.to,
  });

  // The page itself is the only place we decide which UI to render. We
  // gate on `deviceLoading` separately from the chart fetch so the device
  // chip doesn't blink while the chart cache is warming.

  if (deviceLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isNoDevice || !device) {
    return (
      <EmptyState
        title="No UPS detected"
        description="Plug in a supported UPS, then come back to view its history."
      />
    );
  }

  if (!history.isValidRange) {
    return (
      <EmptyState
        title="Invalid range"
        description="Pick a \"From\" date earlier than \"To\" and try again."
        action={
          <Button variant="outline" size="sm" onClick={() => setRange(defaultRange())}>
            Reset to last 24h
          </Button>
        }
      />
    );
  }

  if (history.error) {
    const isNetwork = history.error instanceof ApiError && history.error.status === 0;
    return (
      <EmptyState
        title="Unable to load history"
        description={
          isNetwork
            ? "VoltSense couldn't reach the backend. Make sure the API is still running."
            : history.error.message
        }
        action={
          <Button variant="outline" size="sm" onClick={() => void history.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (history.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!history.data || history.data.length === 0) {
    return (
      <div className="space-y-6">
        <RangeSelector value={range} onChange={setRange} />
        <EmptyState
          title="No history yet"
          description="Check back after some monitoring time has passed. The backend only retains samples it has collected."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">History</h1>
          <p className="text-sm text-muted-foreground">
            {device.manufacturer} {device.model} ·{" "}
            <span className="tabular-nums">
              {history.data.length} sample{history.data.length === 1 ? "" : "s"}
            </span>
          </p>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Battery</CardTitle>
        </CardHeader>
        <CardContent>
          <BatteryHistoryChart data={history.data} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Load</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadHistoryChart data={history.data} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voltage (Input / Output)</CardTitle>
        </CardHeader>
        <CardContent>
          <VoltageHistoryChart data={history.data} />
        </CardContent>
      </Card>
    </div>
  );
}
