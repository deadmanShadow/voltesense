# VoltSense — Frontend.md
## React + TypeScript + Vite Frontend — Complete Step-by-Step Implementation Guide

> ⚠️ **MUST & MUST BE**: প্রতিটি কম্পোনেন্ট, hook, এবং সার্ভিস অবশ্যই **Industry-Expert / Production-Grade** মানের
> হতে হবে — TypeScript strict mode, proper typing (কোনো unnecessary `any` না), component composition,
> separation of concerns (UI vs business logic vs data-fetching), accessible markup, error/loading states,
> এবং clean, readable, reusable কোড। কোনো shortcut বা "quick hack" গ্রহণযোগ্য না। এই নিয়ম পুরো ডকুমেন্ট জুড়ে
> **MUST** মানতে হবে।

এই ডকুমেন্টটি একজন AI coding agent (বা developer)-কে দিলে সে VoltSense-এর সম্পূর্ণ ফ্রন্টএন্ড বাস্তবায়ন করতে পারবে,
PRD (VoltSense v1.0)-এর requirements অনুযায়ী ধাপে ধাপে।

---

## 0. Prerequisites (MUST)

- Node.js 20 LTS+, npm 10+।
- Backend চালু থাকতে হবে `http://localhost:5279` (Backend.md দ্রষ্টব্য)।

---

## 1. Folder Structure (MUST — ঠিক এই কাঠামোই অনুসরণ করতে হবে)

```text
Frontend/
│
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── components.json                # shadcn/ui config
│
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    │
    ├── components/
    │   ├── ui/                    # shadcn/ui generated primitives (Card, Badge, Progress, Tabs...)
    │   ├── layout/
    │   │   ├── AppShell.tsx
    │   │   ├── Sidebar.tsx
    │   │   └── TopBar.tsx
    │   └── common/
    │       ├── ConnectionBadge.tsx
    │       ├── EmptyState.tsx
    │       └── LoadingSpinner.tsx
    │
    ├── features/
    │   ├── dashboard/
    │   │   ├── DashboardPage.tsx
    │   │   ├── components/
    │   │   │   ├── UpsHeader.tsx
    │   │   │   ├── BatteryCard.tsx
    │   │   │   ├── StatusCard.tsx
    │   │   │   ├── LoadCard.tsx
    │   │   │   ├── VoltageCard.tsx
    │   │   │   ├── RuntimeCard.tsx
    │   │   │   └── DeviceInfoCard.tsx
    │   │   └── hooks/
    │   │       └── useLiveTelemetry.ts
    │   │
    │   ├── ups/
    │   │   ├── hooks/
    │   │   │   └── useCurrentUps.ts
    │   │   └── types.ts
    │   │
    │   ├── history/
    │   │   ├── HistoryPage.tsx
    │   │   ├── components/
    │   │   │   ├── BatteryHistoryChart.tsx
    │   │   │   ├── LoadHistoryChart.tsx
    │   │   │   ├── VoltageHistoryChart.tsx
    │   │   │   └── RangeSelector.tsx
    │   │   └── hooks/
    │   │       └── useTelemetryHistory.ts
    │   │
    │   └── settings/
    │       ├── SettingsPage.tsx
    │       └── components/
    │           └── SettingsForm.tsx
    │
    ├── pages/
    │   └── AboutPage.tsx
    │
    ├── hooks/
    │   └── useSignalRConnection.ts
    │
    ├── lib/
    │   ├── utils.ts               # shadcn `cn()` helper
    │   └── formatters.ts          # unit/number formatting (Unavailable-safe)
    │
    ├── services/
    │   ├── apiClient.ts
    │   ├── upsService.ts
    │   ├── historyService.ts
    │   └── signalrService.ts
    │
    ├── stores/
    │   └── connectionStore.ts     # tiny Zustand store (only if/when needed, PRD §27)
    │
    └── types/
        ├── ups.ts
        └── telemetry.ts
```

---

## 2. Phase 1 — Project Initialization

```bash
mkdir Frontend && cd Frontend
npm create vite@latest . -- --template react-ts
npm install

# Tailwind CSS (MUST — industry-standard utility CSS)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Routing
npm install react-router-dom

# Data fetching / server-state (industry-standard, MUST — avoids manual loading/error boilerplate)
npm install @tanstack/react-query

# Realtime
npm install @microsoft/signalr

# Charts (free/open-source only, PRD §53)
npm install recharts

# Utility
npm install clsx tailwind-merge date-fns

# shadcn/ui CLI setup (generates accessible, unstyled-by-default Radix-based components)
npx shadcn@latest init
npx shadcn@latest add card badge progress tabs button select skeleton separator
```

> `@tanstack/react-query` ব্যবহার করা **MUST** — এটা industry-standard data-fetching layer, caching,
> retry, loading/error state automatically handle করে, এবং PRD §28-এর data flow-কে predictable রাখে।

---

## 3. Phase 2 — Tailwind + shadcn/ui Configuration

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        success: { DEFAULT: "hsl(142 71% 45%)", foreground: "hsl(0 0% 100%)" },
        warning: { DEFAULT: "hsl(38 92% 50%)", foreground: "hsl(0 0% 100%)" },
        danger: { DEFAULT: "hsl(0 84% 60%)", foreground: "hsl(0 0% 100%)" },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 4. Phase 3 — TypeScript Domain Types (MUST — strictly mirror backend DTOs)

```ts
// src/types/telemetry.ts
export type UpsStatus =
  | "Unknown" | "Online" | "OnBattery" | "LowBattery"
  | "Charging" | "Discharging" | "Disconnected";

export interface Telemetry {
  timestamp: string;
  batteryCharge: number | null;
  batteryVoltage: number | null;
  loadPercentage: number | null;
  inputVoltage: number | null;
  outputVoltage: number | null;
  runtimeSeconds: number | null;
  temperature: number | null;
  frequency: number | null;
  power: number | null;
  status: UpsStatus;
}
```

```ts
// src/types/ups.ts
export interface UpsDevice {
  id: string;
  manufacturer: string;
  model: string;
  connectionType: string;
  firmwareVersion: string | null;
  lastSeenAt: string;
  isActive: boolean;
}
```

> কোনো field-এ `any` ব্যবহার করা যাবে না। Backend-এর `TelemetryDto`/`UpsDeviceDto`-এর সাথে **exactly** মিলে
> চলতে হবে — কোনো field বাদ/যোগ করলে দুই পাশেই sync রাখতে হবে (MUST)।

---

## 5. Phase 4 — API Client & Services

```ts
// src/services/apiClient.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5279";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(response.status, body.message ?? "Request failed");
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
};

export { API_BASE_URL };
```

```ts
// src/services/upsService.ts
import { apiClient } from "./apiClient";
import type { UpsDevice } from "@/types/ups";

export const upsService = {
  getCurrent: () => apiClient.get<UpsDevice>("/api/ups/current"),
  getAll: () => apiClient.get<UpsDevice[]>("/api/ups"),
  getById: (id: string) => apiClient.get<UpsDevice>(`/api/ups/${id}`),
};
```

```ts
// src/services/historyService.ts
import { apiClient } from "./apiClient";
import type { Telemetry } from "@/types/telemetry";

export const historyService = {
  getHistory: (deviceId: string, from: Date, to: Date) =>
    apiClient.get<Telemetry[]>(
      `/api/ups/${deviceId}/history?from=${from.toISOString()}&to=${to.toISOString()}`
    ),
};
```

```ts
// src/services/signalrService.ts
import * as signalR from "@microsoft/signalr";
import { API_BASE_URL } from "./apiClient";

export function createUpsHubConnection(): signalR.HubConnection {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${API_BASE_URL}/api/hubs/ups`)
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // MUST — resilient realtime, PRD §33
    .configureLogging(signalR.LogLevel.Warning)
    .build();
}
```

---

## 6. Phase 5 — SignalR Hook (realtime, MUST — no polling for telemetry)

```ts
// src/hooks/useSignalRConnection.ts
import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { createUpsHubConnection } from "@/services/signalrService";

export type HubConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected";

export function useSignalRConnection() {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const [state, setState] = useState<HubConnectionState>("connecting");

  useEffect(() => {
    const connection = createUpsHubConnection();
    connectionRef.current = connection;

    connection.onreconnecting(() => setState("reconnecting"));
    connection.onreconnected(() => setState("connected"));
    connection.onclose(() => setState("disconnected"));

    connection
      .start()
      .then(() => setState("connected"))
      .catch(() => setState("disconnected"));

    return () => {
      connection.stop();
    };
  }, []);

  return { connection: connectionRef.current, state };
}
```

```ts
// src/features/dashboard/hooks/useLiveTelemetry.ts
import { useEffect, useState } from "react";
import type { HubConnection } from "@microsoft/signalr";
import type { Telemetry, UpsStatus } from "@/types/telemetry";

interface LiveTelemetryState {
  telemetry: Telemetry | null;
  isUpsConnected: boolean;
  status: UpsStatus | null;
}

export function useLiveTelemetry(connection: HubConnection | null) {
  const [state, setState] = useState<LiveTelemetryState>({
    telemetry: null,
    isUpsConnected: false,
    status: null,
  });

  useEffect(() => {
    if (!connection) return;

    const onTelemetryUpdated = (telemetry: Telemetry) =>
      setState((prev) => ({ ...prev, telemetry, status: telemetry.status }));
    const onConnected = () => setState((prev) => ({ ...prev, isUpsConnected: true }));
    const onDisconnected = () => setState((prev) => ({ ...prev, isUpsConnected: false }));
    const onStatusChanged = (status: UpsStatus) => setState((prev) => ({ ...prev, status }));

    connection.on("ups:telemetry-updated", onTelemetryUpdated);
    connection.on("ups:connected", onConnected);
    connection.on("ups:disconnected", onDisconnected);
    connection.on("ups:status-changed", onStatusChanged);

    return () => {
      connection.off("ups:telemetry-updated", onTelemetryUpdated);
      connection.off("ups:connected", onConnected);
      connection.off("ups:disconnected", onDisconnected);
      connection.off("ups:status-changed", onStatusChanged);
    };
  }, [connection]);

  return state;
}
```

---

## 7. Phase 6 — React Query Hooks (initial load, PRD §28)

```ts
// src/features/ups/hooks/useCurrentUps.ts
import { useQuery } from "@tanstack/react-query";
import { upsService } from "@/services/upsService";
import { ApiError } from "@/services/apiClient";

export function useCurrentUps() {
  return useQuery({
    queryKey: ["ups", "current"],
    queryFn: upsService.getCurrent,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false; // "No UPS detected"
      return failureCount < 2;
    },
    refetchInterval: 30_000, // light fallback poll; live updates come via SignalR
  });
}
```

```ts
// src/features/history/hooks/useTelemetryHistory.ts
import { useQuery } from "@tanstack/react-query";
import { historyService } from "@/services/historyService";

export function useTelemetryHistory(deviceId: string | undefined, from: Date, to: Date) {
  return useQuery({
    queryKey: ["ups", deviceId, "history", from.toISOString(), to.toISOString()],
    queryFn: () => historyService.getHistory(deviceId!, from, to),
    enabled: Boolean(deviceId),
  });
}
```

---

## 8. Phase 7 — Formatters (MUST — never fabricate, always show "Unavailable")

```ts
// src/lib/formatters.ts
export function formatPercent(value: number | null): string {
  return value === null ? "Unavailable" : `${Math.round(value)}%`;
}

export function formatVoltage(value: number | null): string {
  return value === null ? "Unavailable" : `${value.toFixed(1)} V`;
}

export function formatWatts(value: number | null): string {
  return value === null ? "Unavailable" : `${Math.round(value)} W`;
}

export function formatRuntime(seconds: number | null): string {
  if (seconds === null) return "Unavailable";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${rest}m`;
}

export function formatTemperature(value: number | null): string {
  return value === null ? "Unavailable" : `${value.toFixed(1)}°C`;
}
```

---

## 9. Phase 8 — Dashboard Components (PRD §17, §52)

```tsx
// src/features/dashboard/components/BatteryCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface BatteryCardProps {
  chargePercent: number | null;
  status: string | null;
}

export function BatteryCard({ chargePercent, status }: BatteryCardProps) {
  const isLow = chargePercent !== null && chargePercent <= 20;

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Battery</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between mb-3">
          <span className={cn("text-4xl font-semibold", isLow && "text-danger")}>
            {formatPercent(chargePercent)}
          </span>
          {status && <span className="text-sm text-muted-foreground">{status}</span>}
        </div>
        <Progress
          value={chargePercent ?? 0}
          className={cn(isLow && "[&>div]:bg-danger")}
          aria-label="Battery charge"
        />
      </CardContent>
    </Card>
  );
}
```

```tsx
// src/features/dashboard/components/StatusCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { UpsStatus } from "@/types/telemetry";

const STATUS_VARIANT: Record<UpsStatus, "default" | "secondary" | "destructive"> = {
  Online: "default",
  Charging: "default",
  OnBattery: "secondary",
  Discharging: "secondary",
  LowBattery: "destructive",
  Disconnected: "destructive",
  Unknown: "secondary",
};

export function StatusCard({ status }: { status: UpsStatus | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">UPS Status</CardTitle>
      </CardHeader>
      <CardContent>
        <Badge variant={status ? STATUS_VARIANT[status] : "secondary"}>
          {status ?? "Unknown"}
        </Badge>
      </CardContent>
    </Card>
  );
}
```

```tsx
// src/features/dashboard/components/LoadCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/formatters";

export function LoadCard({ loadPercent }: { loadPercent: number | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Load</CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-2xl font-semibold">{formatPercent(loadPercent)}</span>
      </CardContent>
    </Card>
  );
}
```

```tsx
// src/features/dashboard/components/VoltageCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatVoltage } from "@/lib/formatters";

interface VoltageCardProps {
  label: string;
  voltage: number | null;
}

export function VoltageCard({ label, voltage }: VoltageCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-2xl font-semibold">{formatVoltage(voltage)}</span>
      </CardContent>
    </Card>
  );
}
```

```tsx
// src/features/dashboard/components/RuntimeCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRuntime } from "@/lib/formatters";

export function RuntimeCard({ seconds }: { seconds: number | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Estimated Runtime</CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-2xl font-semibold">{formatRuntime(seconds)}</span>
      </CardContent>
    </Card>
  );
}
```

```tsx
// src/features/dashboard/components/UpsHeader.tsx
import { ConnectionBadge } from "@/components/common/ConnectionBadge";
import type { UpsDevice } from "@/types/ups";

interface UpsHeaderProps {
  device: UpsDevice | null;
  isConnected: boolean;
}

export function UpsHeader({ device, isConnected }: UpsHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold">{device?.manufacturer ?? "VoltSense"}</h1>
        <p className="text-sm text-muted-foreground">{device?.model ?? "No UPS detected"}</p>
      </div>
      <ConnectionBadge isConnected={isConnected} />
    </div>
  );
}
```

```tsx
// src/components/common/ConnectionBadge.tsx
import { Badge } from "@/components/ui/badge";

export function ConnectionBadge({ isConnected }: { isConnected: boolean }) {
  return (
    <Badge variant={isConnected ? "default" : "destructive"} className="gap-1.5">
      <span
        className={`h-2 w-2 rounded-full ${isConnected ? "bg-success" : "bg-danger"}`}
        aria-hidden
      />
      {isConnected ? "Connected" : "Disconnected"}
    </Badge>
  );
}
```

```tsx
// src/components/common/EmptyState.tsx
export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h2 className="text-lg font-medium">{title}</h2>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
    </div>
  );
}
```

---

## 10. Phase 9 — Dashboard Page (wires React Query + SignalR together, PRD §29)

```tsx
// src/features/dashboard/DashboardPage.tsx
import { useSignalRConnection } from "@/hooks/useSignalRConnection";
import { useLiveTelemetry } from "./hooks/useLiveTelemetry";
import { useCurrentUps } from "@/features/ups/hooks/useCurrentUps";
import { UpsHeader } from "./components/UpsHeader";
import { BatteryCard } from "./components/BatteryCard";
import { StatusCard } from "./components/StatusCard";
import { LoadCard } from "./components/LoadCard";
import { VoltageCard } from "./components/VoltageCard";
import { RuntimeCard } from "./components/RuntimeCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/services/apiClient";

export function DashboardPage() {
  const { connection } = useSignalRConnection();
  const live = useLiveTelemetry(connection);
  const { data: device, isLoading, error } = useCurrentUps();

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  const noDevice = error instanceof ApiError && error.status === 404;
  if (noDevice) {
    return <EmptyState title="No UPS detected" description="Plug in a supported UPS to start monitoring." />;
  }

  const t = live.telemetry;

  return (
    <div>
      <UpsHeader device={device ?? null} isConnected={live.isUpsConnected} />
      <div className="grid grid-cols-4 gap-4">
        <BatteryCard chargePercent={t?.batteryCharge ?? null} status={live.status} />
        <StatusCard status={live.status} />
        <LoadCard loadPercent={t?.loadPercentage ?? null} />
        <VoltageCard label="Input Voltage" voltage={t?.inputVoltage ?? null} />
        <VoltageCard label="Output Voltage" voltage={t?.outputVoltage ?? null} />
        <RuntimeCard seconds={t?.runtimeSeconds ?? null} />
      </div>
    </div>
  );
}
```

---

## 11. Phase 10 — History Page (Recharts, PRD §53)

```tsx
// src/features/history/components/BatteryHistoryChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Telemetry } from "@/types/telemetry";
import { format } from "date-fns";

export function BatteryHistoryChart({ data }: { data: Telemetry[] }) {
  const chartData = data.map((d) => ({
    time: format(new Date(d.timestamp), "HH:mm"),
    charge: d.batteryCharge,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="time" fontSize={12} />
        <YAxis domain={[0, 100]} fontSize={12} unit="%" />
        <Tooltip />
        <Line type="monotone" dataKey="charge" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

```tsx
// src/features/history/HistoryPage.tsx
import { useState } from "react";
import { useCurrentUps } from "@/features/ups/hooks/useCurrentUps";
import { useTelemetryHistory } from "./hooks/useTelemetryHistory";
import { BatteryHistoryChart } from "./components/BatteryHistoryChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";

export function HistoryPage() {
  const { data: device } = useCurrentUps();
  const [from] = useState(() => new Date(Date.now() - 24 * 60 * 60 * 1000));
  const [to] = useState(() => new Date());

  const { data: history, isLoading } = useTelemetryHistory(device?.id, from, to);

  if (!device) return <EmptyState title="No UPS detected" />;
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!history || history.length === 0) {
    return <EmptyState title="No history yet" description="Check back after some monitoring time has passed." />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Battery History (24h)</CardTitle>
      </CardHeader>
      <CardContent>
        <BatteryHistoryChart data={history} />
      </CardContent>
    </Card>
  );
}
```

---

## 12. Phase 11 — Settings & About Pages (PRD §31, §30)

```tsx
// src/features/settings/SettingsPage.tsx
// MVP: monitoring interval / retention days are display-only (server-driven config).
// No hardware-control settings must ever be added here (read-only policy, PRD §31).
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>Monitoring interval and telemetry retention are configured on the backend
          (appsettings.json) and applied automatically. VoltSense never exposes UPS
          control settings — it is a read-only monitoring tool.</p>
      </CardContent>
    </Card>
  );
}
```

```tsx
// src/pages/AboutPage.tsx
export function AboutPage() {
  return (
    <div className="max-w-xl space-y-2 text-sm text-muted-foreground">
      <h1 className="text-lg font-semibold text-foreground">VoltSense</h1>
      <p>Free, read-only, local-first UPS monitoring. No cloud, no account, no paid dependency.</p>
    </div>
  );
}
```

---

## 13. Phase 12 — App Shell, Routing, Providers

```tsx
// src/components/layout/AppShell.tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
```

```tsx
// src/components/layout/Sidebar.tsx
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "Dashboard" },
  { to: "/history", label: "History" },
  { to: "/settings", label: "Settings" },
  { to: "/about", label: "About" },
];

export function Sidebar() {
  return (
    <nav className="w-48 border-r border-border p-4 space-y-1">
      <div className="font-semibold mb-4 px-2">VoltSense</div>
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === "/"}
          className={({ isActive }) =>
            cn(
              "block px-2 py-1.5 rounded-md text-sm",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            )
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
```

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { HistoryPage } from "@/features/history/HistoryPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { AboutPage } from "@/pages/AboutPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="about" element={<AboutPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

---

## 14. Phase 13 — Environment Config

```text
# Frontend/.env.development
VITE_API_BASE_URL=http://localhost:5279
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: { port: 5173 },
});
```

```json
// tsconfig.json (relevant excerpt — MUST: strict mode, PRD §62 rule 1)
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

---

## 15. Phase 14 — Error & Connection States (PRD §32, MUST cover all states)

কম্পোনেন্ট-লেভেলে চারটি অবস্থা অবশ্যই স্পষ্টভাবে আলাদা করে দেখাতে হবে:

| State | UI |
|---|---|
| Connected | `ConnectionBadge` সবুজ, live telemetry কার্ড দেখাবে |
| Searching | Skeleton loaders (`useCurrentUps` এখনো `isLoading`) |
| Disconnected | `ConnectionBadge` লাল + "UPS Disconnected" banner, শেষ known value ধূসর/faded দেখানো যেতে পারে |
| Unsupported / Error | `EmptyState` with "Unable to read UPS telemetry" |

---

## 16. Phase 15 — Run Locally (Development)

```bash
cd Frontend
npm install
npm run dev
# → http://localhost:5173, connects to backend at http://localhost:5279
```

Production build:

```bash
npm run build   # outputs to dist/, static files — can be served by any local static server
npm run preview
```

---

## 17. Testing Strategy (MUST)

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Test করতে হবে:
- Formatters (`formatPercent`, `formatVoltage` ইত্যাদি) — null → "Unavailable" edge cases।
- `BatteryCard`, `StatusCard` ইত্যাদি — null props দিলে crash না করা।
- `useLiveTelemetry` hook — mocked `HubConnection` দিয়ে event handling verify।
- `DashboardPage` — 404 (no UPS) render path snapshot।

---

## 18. Acceptance Checklist (এই সব MUST পূরণ করতে হবে — PRD §58)

- [ ] `npm run build` কোনো TypeScript error ছাড়া successful (strict mode)।
- [ ] কোনো hardware-control UI/button কোথাও নেই (shutdown/restart/test)।
- [ ] সব telemetry field null হলে "Unavailable" দেখায়, কখনো ভুয়া মান দেখায় না।
- [ ] Dashboard real-time SignalR দিয়ে আপডেট হয়, ম্যানুয়াল রিফ্রেশ লাগে না।
- [ ] UPS disconnect/reconnect UI স্পষ্টভাবে reflect করে, error crash করে না।
- [ ] শুধুমাত্র free/open-source লাইব্রেরি ব্যবহৃত হয়েছে (কোনো paid API key নেই)।
- [ ] UI minimal, clean, কোনো excessive animation/decoration নেই (PRD §29)।
- [ ] Responsive এবং desktop-friendly।

---

**এই ডকুমেন্ট সম্পূর্ণ frontend implementation-এর blueprint। প্রতিটি কম্পোনেন্ট ও hook অবশ্যই industry-expert
মানে, TypeScript strict mode-এ, এবং backend-এর DTO shape-এর সাথে সম্পূর্ণ sync রেখে লিখতে হবে।**
