# VoltSense

> **Free, open-source, read-only UPS monitoring for the desktop.**
> No cloud. No subscriptions. No shutdown / restart / self-test controls. Just a clean, honest dashboard of what your UPS is doing right now and what it did in the last 30 days.

---

## What is VoltSense?

VoltSense is a **lightweight, locally hosted UPS monitoring application**. Plug a supported UPS into your machine, start VoltSense, and it will:

- **Auto-detect** the connected UPS over USB HID (no driver juggling, no vendor SDK)
- **Read** live telemetry — battery charge, load, input/output voltage, estimated runtime, status
- **Stream** changes to the dashboard in real time via **SignalR**
- **Persist** snapshots to **PostgreSQL** for the history view (default: last 30 days)
- **Plot** battery, load, and voltage charts over selectable ranges (1 hour / 24 hours / 7 days / custom)
- **Tell the truth** — when a value is unavailable from the hardware, the UI shows **"Unavailable"**, never a made-up number

### What VoltSense will *never* do

Per the product's [PRD §2](PRD.md) — *read-only is a hard contract*:

- ❌ Shutdown, restart, sleep, hibernate the host
- ❌ Run UPS self-tests
- ❌ Change UPS configuration (alarm thresholds, transfer voltage, etc.)
- ❌ Phone home, talk to a vendor cloud, or require an account
- ❌ Lock features behind a paid tier

The Settings page in the UI calls this out explicitly so users know what's intentional.

---

## Design principles

These five guide every decision in the codebase. They are not aspirational — they are checked in code review.

| # | Principle | What it means in practice |
|---|-----------|---------------------------|
| 1 | **Read-only** | No write paths exist against the UPS. The only hardware call is `HidSharp.DeviceList.Local.GetHidDevice(...)` for read-only reports. |
| 2 | **Local-first** | All data lives on your machine (PostgreSQL on `localhost`). Nothing leaves your network. |
| 3 | **Free forever** | No paid SDKs, no telemetry endpoints, no "premium" features. MIT licensed. |
| 4 | **Minimal** | Six cards on the dashboard, three chart types, three pages (Dashboard / History / Settings) plus About. No enterprise sprawl. |
| 5 | **Hardware-agnostic** | A pluggable `IUpsProvider` interface lets new UPS families be supported without touching the dashboard, repository, or SignalR hub. |

---

## Tech stack

### Frontend — `Frontend/`

| Concern | Choice | Version |
|---|---|---|
| Framework | [React](https://react.dev/) | 18.3 |
| Language | [TypeScript](https://www.typescriptlang.org/) (strict mode, `noImplicitAny`) | 5.6 |
| Build tool | [Vite](https://vitejs.dev/) | 5.4 |
| Routing | [react-router-dom](https://reactrouter.com/) | 6.27 |
| Server state | [@tanstack/react-query](https://tanstack.com/query) | 5.59 |
| Real-time | [@microsoft/signalr](https://learn.microsoft.com/en-us/aspnet/core/signalr/javascript-client) | 8.0 |
| Charts | [recharts](https://recharts.org/) | 2.13 |
| Styling | [Tailwind CSS](https://tailwindcss.com/) + shadcn/ui-style primitives | 3.4 |
| Date utils | [date-fns](https://date-fns.org/) | 4.1 |
| State (auxiliary) | [zustand](https://github.com/pmndrs/zustand) | 5.0 |
| Testing | [Vitest](https://vitest.dev/) + [@testing-library/react](https://testing-library.com/) + [vitest-axe](https://github.com/chaance/vitest-axe) | 2.1 / 16 / 0.1 |
| A11y audits | [axe-core](https://github.com/dequelabs/axe-core) (WCAG 2.1 AA) | 4.10 |

### Backend — `Backend/`

| Concern | Choice | Version |
|---|---|---|
| Runtime | [.NET](https://dotnet.microsoft.com/) | **10.0** (LTS) |
| Web framework | ASP.NET Core (Controllers + Minimal APIs + SignalR) | 10.0 |
| Architecture | Clean Architecture (Domain → Application → Infrastructure → Api) | — |
| ORM | [Entity Framework Core](https://learn.microsoft.com/en-us/ef/) + [Npgsql](https://www.npgsql.org/) | 10.0 |
| Database | [PostgreSQL](https://www.postgresql.org/) | 16 |
| HID / UPS access | [HidSharp](https://www.zer7.com/software/hidsharp) | 2.6 |
| Validation | [FluentValidation.AspNetCore](https://docs.fluentvalidation.net/) | 11.3 |
| Logging | [Serilog](https://serilog.net/) (structured, console sink) | 10.0 |
| API docs | [Swashbuckle / Swagger UI](https://github.com/domaindrivendev/Swashbuckle.AspNetCore) | 10.2 |
| Tests | xUnit + Microsoft.AspNetCore.Mvc.Testing + FluentAssertions | — |

### Infrastructure

| Concern | Choice |
|---|---|
| Local stack | Docker Compose (PostgreSQL 16) |
| Cloud deploy | [Render](https://render.com/) Blueprint (`render.yaml`) — free tier, PostgreSQL managed |
| CI | GitHub Actions (`frontend-ci.yml`): typecheck + test + build + bundle-size budget |

---

## How it works (architecture)

```
┌──────────────────────────────────────────────────────────────────┐
│                          Browser (React)                          │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────┐  │
│  │ useCurrentUps  │  │ useLiveTelemetry│  │ useTelemetryHistory │  │
│  │  (React Query) │  │  (SignalR hook) │  │   (React Query)     │  │
│  └───────┬────────┘  └────────┬───────┘  └──────────┬──────────┘  │
└──────────┼────────────────────┼─────────────────────┼─────────────┘
           │                    │                     │
           │  REST /api/ups/*   │  WS /api/hubs/ups    │  REST /api/telemetry/*
           ▼                    ▼                     ▼
┌──────────────────────────────────────────────────────────────────┐
│                       ASP.NET Core API                           │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────┐  │
│  │ UpsController  │  │   UpsHub       │  │ TelemetryController │  │
│  │ TelemetryCtrl  │  │ (SignalR)      │  │ HistoryController   │  │
│  │ SystemCtrl     │  │                │  │                     │  │
│  └───────┬────────┘  └────────┬───────┘  └──────────┬──────────┘  │
│          │                   │                      │             │
│          ▼                   ▼                      ▼             │
│  ┌──────────────────┐   ┌─────────────────┐  ┌──────────────────┐ │
│  │ Application      │   │ SignalRTelemetry│  │ EF Core          │ │
│  │  Use Cases       │   │   Broadcaster   │  │ Repositories     │ │
│  └────────┬─────────┘   └────────┬────────┘  └────────┬─────────┘ │
│           │                      │                     │           │
│           └──────────┬───────────┘                     │           │
│                      ▼                                 ▼           │
│           ┌──────────────────────┐         ┌──────────────────────┐│
│           │ UpsMonitoringWorker  │────────►│     PostgreSQL       ││
│           │ (BackgroundService,  │  writes │  (telemetry_snapshots││
│           │  5 s interval)       │         │   devices, events)   ││
│           └──────────┬───────────┘         └──────────────────────┘│
│                      │                                            │
│                      ▼                                            │
│           ┌──────────────────────┐                                │
│           │   IUpsProvider       │  ◄── HidSharp (Windows HID)   │
│           │  WindowsHidUpsProv.  │                                │
│           └──────────────────────┘                                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │  Physical UPS    │
                     │  (USB HID)       │
                     └──────────────────┘
```

### Layer responsibilities

- **Domain** (`VoltSense.Domain`) — Entities (`UpsDevice`, `TelemetrySnapshot`, `ConnectionEvent`), value objects, enums (`UpsStatus`, `ConnectionType`), and provider interfaces. Zero dependencies.
- **Application** (`VoltSense.Application`) — Use-case handlers (`GetCurrentUps`, `GetUpsList`, `GetTelemetryHistory`), DTOs, the orchestration `IUpsMonitoringService`, and retention logic. Depends only on Domain.
- **Infrastructure** (`VoltSense.Infrastructure`) — EF Core `VoltSenseDbContext`, repositories, the HidSharp `WindowsHidUpsProvider`, the SignalR broadcaster, and the connection-string normalizer.
- **Api** (`VoltSense.Api`) — `Program.cs` (composition root), controllers, `UpsHub`, `UpsMonitoringWorker` (`BackgroundService`), middleware (exception handling, Serilog request logging), Swagger, CORS.

### Data flow — one telemetry cycle

1. `UpsMonitoringWorker` ticks every `Monitoring:IntervalSeconds` (default 5 s).
2. It calls `IUpsProvider.ReadAsync()` → a fresh `UpsTelemetry` snapshot from the HID device (or empty values if the UPS is unreachable).
3. It diffs the snapshot against the previous one; if anything changed, it writes a `TelemetrySnapshot` row and asks `ITelemetryBroadcaster.BroadcastAsync(...)`.
4. The broadcaster pushes JSON down every open SignalR connection via `UpsHub`.
5. The frontend's `useLiveTelemetry` hook receives the payload and re-renders the affected cards.

---

## Project structure in detail

### Backend

```
Backend/
├─ VoltSense.sln
├─ src/
│  ├─ VoltSense.Domain/
│  │  ├─ Entities/             UpsDevice, TelemetrySnapshot, ConnectionEvent
│  │  ├─ Enums/                UpsStatus, ConnectionType
│  │  ├─ ValueObjects/         UpsTelemetry, UpsDeviceInfo, UpsConnectionStatus
│  │  ├─ Interfaces/           IUpsProvider, IUpsRepository, …
│  │  └─ Common/               Result<T>
│  ├─ VoltSense.Application/
│  │  ├─ DTOs/                 UpsDeviceDto, TelemetryDto, HistoryQueryDto
│  │  ├─ Interfaces/           IUpsMonitoringService, ITelemetryBroadcaster
│  │  ├─ Services/             UpsMonitoringService, TelemetryRetentionService
│  │  ├─ UseCases/             GetCurrentUps, GetUpsList, GetTelemetryHistory
│  │  └─ Validation/           FluentValidation validators
│  ├─ VoltSense.Infrastructure/
│  │  ├─ Persistence/          VoltSenseDbContext, Repositories, Configurations
│  │  ├─ UPS/                  WindowsHidUpsProvider, HidUpsDetector
│  │  └─ Realtime/             SignalRTelemetryBroadcaster
│  └─ VoltSense.Api/
│     ├─ Controllers/          UpsController, TelemetryController, HistoryController, SystemController
│     ├─ Hubs/                 UpsHub, SignalRTelemetryBroadcaster (DI adapter)
│     ├─ BackgroundServices/   UpsMonitoringWorker
│     ├─ Middleware/           ExceptionHandlingMiddleware
│     ├─ Program.cs            ← composition root
│     └─ appsettings*.json
├─ tests/                      xUnit test projects per layer
└─ tools/
   └─ DbSmokeTest/             `dotnet run --project tools/DbSmokeTest` — connect & ping
```

### Frontend

```
Frontend/
├─ src/
│  ├─ main.tsx                 Entry — QueryClientProvider + BrowserRouter
│  ├─ App.tsx                  Route tree + AppShell
│  ├─ index.css                Tailwind base + theme variables
│  ├─ components/
│  │  ├─ ui/                   shadcn-style primitives (Card, Badge, Button, Tabs, Select, Skeleton, Progress, Separator)
│  │  ├─ layout/               Sidebar, TopBar, AppShell
│  │  └─ common/               ConnectionBadge, EmptyState, LoadingSpinner
│  ├─ features/
│  │  ├─ dashboard/            DashboardPage + cards + useLiveTelemetry
│  │  ├─ ups/                  useCurrentUps hook
│  │  ├─ history/              HistoryPage + charts + useTelemetryHistory
│  │  └─ settings/             SettingsPage (read-only device metadata)
│  ├─ pages/AboutPage.tsx      Project manifesto
│  ├─ hooks/useSignalRConnection.ts
│  ├─ lib/
│  │  ├─ formatters.ts         null-safe number / time / voltage formatters
│  │  └─ utils.ts              `cn()` helper (clsx + tailwind-merge)
│  ├─ services/
│  │  ├─ apiClient.ts          fetch wrapper, ApiError, timeouts
│  │  ├─ upsService.ts         getCurrent/getAll/getById
│  │  ├─ historyService.ts     getHistory with range validation
│  │  └─ signalrService.ts     HubConnection factory + method constants
│  ├─ types/                   telemetry.ts, ups.ts (closed unions)
│  └─ test/                    Vitest setup, QueryClient helpers, fake HubConnection
```

---

## HTTP API + SignalR contract

Full Swagger docs are available at **`http://localhost:5279/swagger`** when the backend is running in `Development`.

### REST endpoints

| Method | Path | Purpose | Notes |
|--------|------|---------|-------|
| `GET` | `/api/ups/current` | The currently detected UPS device | **404** when no UPS is plugged in (this is *not* an error — frontend renders "No UPS detected") |
| `GET` | `/api/ups` | All known UPS devices (history of connections) | |
| `GET` | `/api/ups/{id}` | A single device by id | |
| `GET` | `/api/telemetry/current` | Latest telemetry snapshot for the active UPS | |
| `GET` | `/api/telemetry/history` | History with `from` / `to` query params | Range validated server-side |
| `GET` | `/health` | Liveness probe | `200 OK` |

### SignalR hub — `/api/hubs/ups`

The hub pushes **four** server-to-client methods. The frontend subscribes to all four in `useLiveTelemetry`.

| Method | Payload | When it fires |
|--------|---------|---------------|
| `telemetryUpdated` | `TelemetryDto` | Every time the polling worker sees a change |
| `statusChanged` | `UpsStatus` | UPS goes online / on-battery / low / disconnected / etc. |
| `upsConnected` | `UpsDeviceDto` | A UPS has just been plugged in |
| `upsDisconnected` | `{ id: string }` | A UPS has been unplugged (or HID stream dropped) |

Connection lifecycle (PRD §33):

```ts
// reconnection backoff: 0s → 2s → 5s → 10s → 30s
.withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
```


## Troubleshooting

### "No UPS detected"

Means exactly what it says — either no UPS is plugged in, or the HID detection didn't recognise it. Check:

1. **USB cable** is fully seated on both ends.
2. **Windows Device Manager** → "Human Interface Devices" — your UPS should appear.
3. **Backend logs** — `dotnet run` should log either `Detected UPS device: …` or `no UPS detected`.
4. The frontend will show this as an **info** state, not an error.

### "Unable to read UPS telemetry"

Backend is reachable but a different error came back. Two common causes:

- **Backend isn't running** — the dashboard helpfully says so: *"VoltSense couldn't reach the backend. Make sure the API is still running on http://localhost:5279."*
- **Database is down / migrations failed** — check the backend console for `Database migration failed on startup` or connection errors.

Click **Retry** after fixing the underlying issue.


## Acknowledgements

- [HidSharp](https://www.zer7.com/software/hidsharp) — pure-managed HID access that makes Windows plug-and-play UPS support tractable.
- [SignalR](https://learn.microsoft.com/en-us/aspnet/core/signalr/introduction) — the realtime backbone.
- [shadcn/ui](https://ui.shadcn.com/) — the design language for the cards / badges / tabs (we ship the primitives directly, not the registry).
- The open-source UPS community — for documenting the HID reports that make driverless monitoring possible.
