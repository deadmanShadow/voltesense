# VoltSense

> **Free, open-source, read-only UPS monitoring for the desktop.**
> No cloud. No subscriptions. No shutdown / restart / self-test controls. Just a clean, honest dashboard of what your UPS is doing right now and what it did in the last 30 days.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](#license)
[![.NET 10](https://img.shields.io/badge/.NET-10.0-512BD4)](https://dotnet.microsoft.com/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB)](https://react.dev/)
[![TypeScript 5.6](https://img.shields.io/badge/TypeScript-5.6%20strict-3178C6)](https://www.typescriptlang.org/)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-336791)](https://www.postgresql.org/)

---

## Table of contents

- [What is VoltSense?](#what-is-voltsense)
- [Design principles](#design-principles)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Quick start](#quick-start)
- [Running locally — step by step](#running-locally--step-by-step)
- [Configuration](#configuration)
- [How it works (architecture)](#how-it-works-architecture)
- [Project structure in detail](#project-structure-in-detail)
- [HTTP API + SignalR contract](#http-api--signalr-contract)
- [Testing](#testing)
- [Build & deployment](#build--deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

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

## Repository layout

```
voltsense/
├─ Frontend/                  React + Vite app (the dashboard)
├─ Backend/                   ASP.NET Core Web API + SignalR hub
│  ├─ src/
│  │  ├─ VoltSense.Domain/         Entities, value objects, enums, interfaces
│  │  ├─ VoltSense.Application/    Use cases, DTOs, services
│  │  ├─ VoltSense.Infrastructure/ EF Core, HidSharp provider, repositories
│  │  └─ VoltSense.Api/            Controllers, hub, hosted services, Program.cs
│  ├─ tests/
│  │  ├─ VoltSense.Domain.Tests/
│  │  ├─ VoltSense.Application.Tests/
│  │  └─ VoltSense.Infrastructure.Tests/
│  └─ tools/
│     └─ DbSmokeTest/          Manual DB connectivity probe
├─ docker-compose.yml         PostgreSQL 16 + Backend image
├─ render.yaml                Render Blueprint
├─ PRD.md                     Product Requirements Document (v1.0)
├─ backend.md                 Step-by-step backend implementation guide
├─ frontend.md                Step-by-step frontend implementation guide
├─ Docker and Deploy.md       Container + deploy walkthrough
└─ README.md                  ← you are here
```

---

## Quick start

The fastest path from a fresh clone to a running dashboard.

### Prerequisites

| Tool | Version | Why |
|---|---|---|
| **.NET SDK** | 10.0 | Backend build & run |
| **Node.js** | 20 LTS or newer (npm 10+) | Frontend build & run |
| **PostgreSQL** | 15+ (or Docker) | Telemetry persistence |
| **Windows 10/11** | for real UPS detection (USB HID) | HidSharp targets Windows first |
| A supported UPS | APC Back-UPS / Smart-UPS family recommended | Optional — you can develop & test without one |

### 1. Clone

```bash
git clone https://github.com/deadmanShadow/voltesense.git
cd voltsense
```

### 2. Start PostgreSQL

Easiest: Docker.

```bash
docker compose up -d postgres
```

…or use a host-installed PostgreSQL and create the database manually:

```sql
CREATE DATABASE voltsense;
CREATE USER voltsense_user WITH PASSWORD 'voltsense_local_pw';
GRANT ALL PRIVILEGES ON DATABASE voltsense TO voltsense_user;
```

### 3. Configure the backend

The backend reads the connection string from `appsettings.json` → `appsettings.Development.json` → user-secrets → environment variables.

For local dev with the bundled `docker-compose.yml`, edit `Backend/src/VoltSense.Api/appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=voltsense;Username=voltsense_user;Password=voltsense_local_pw"
  },
  "Monitoring": {
    "IntervalSeconds": 5,
    "RetentionDays": 30
  }
}
```

Or use **user-secrets** (recommended — keeps the password out of the repo):

```bash
cd Backend/src/VoltSense.Api
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=voltsense;Username=voltsense_user;Password=voltsense_local_pw"
```

### 4. Run the backend

```bash
cd Backend/src/VoltSense.Api
dotnet run
```

On first run it will **auto-apply EF Core migrations** (controlled by `Database:AutoMigrate` — defaults to `true`). It then starts listening on:

- **HTTP API + Swagger UI**: <http://localhost:5279/swagger>
- **SignalR hub**: `ws://localhost:5279/api/hubs/ups`
- **Health check**: <http://localhost:5279/health>

If a UPS is plugged in and recognised, you'll see log lines like:

```
[Information] [VoltSense.Api] Detected UPS device: APC Back-UPS 1500 (USB\VID_051D&PID_0002)
[Information] [VoltSense.Api] Telemetry cycle #1 complete in 87 ms
```

### 5. Run the frontend

In a **second** terminal:

```bash
cd Frontend
npm install
npm run dev
```

Open <http://localhost:5173>. You should see:

- The **Dashboard** with the six live cards (or "No UPS detected" / "Unable to read…" empty states — see [Troubleshooting](#troubleshooting))
- The **History** page with the range selector
- The **Settings** page listing the detected device's manufacturer / model / firmware

---

## Running locally — step by step

The above is the happy path. Here is the full procedure including **no-UPS development**, **environment variables**, and **production builds**.

### A. Without a UPS hardware

If you don't have a UPS plugged in, the backend will log "no UPS detected" once at startup, and `GET /api/ups/current` will return **404**. The frontend handles this gracefully — you'll see the **"No UPS detected"** empty state, not an error.

This is a feature: the system reports **honestly** what the hardware is doing.

### B. Environment variables

Both apps honour standard env-var overrides (12-factor). Dots become double-underscores:

| Variable | Purpose | Default |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | Backend Postgres DSN | `appsettings.json` |
| `Monitoring__IntervalSeconds` | Telemetry polling cadence | `5` |
| `Monitoring__RetentionDays` | How long to keep history | `30` |
| `Database__AutoMigrate` | Apply migrations on startup | `true` |
| `ASPNETCORE_ENVIRONMENT` | `Development` / `Production` | `Production` |
| `VITE_API_BASE_URL` | Frontend → backend base URL | empty (uses Vite proxy) |
| `PORT` | Backend port (Render sets this to `8080`) | `5279` (dev) |

### C. Production build

**Backend:**

```bash
cd Backend
dotnet publish -c Release -o ./publish
./publish/VoltSense.Api
```

**Frontend:**

```bash
cd Frontend
npm run build          # writes dist/
npm run preview        # serves dist/ locally on http://localhost:4173
```

For local-first deployment, serve `Frontend/dist/` from the backend (or from any static host) and set `VITE_API_BASE_URL` to the backend's public URL at build time.

### D. Full Docker stack

```bash
docker compose up -d --build
```

This starts PostgreSQL **and** the backend. The frontend is not containerised by default — run it locally with `npm run dev` or serve `dist/` behind your reverse proxy of choice.

> **Note:** USB HID access from inside a Linux container requires the host to expose the device and a Linux `IUpsProvider` implementation (currently a Windows-HID-only MVP). For UPS hardware testing, run the backend on the host directly.

---

## Configuration

### Backend — `Backend/src/VoltSense.Api/appsettings.json`

```jsonc
{
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": ""            // ← set this via env var or user-secrets
  },
  "Database": {
    "AutoMigrate": true                // apply EF migrations on startup
  },
  "Monitoring": {
    "IntervalSeconds": 5,              // how often the worker polls the UPS
    "RetentionDays": 30                // telemetry retention window
  },
  "Serilog": { /* … see file for the structured-logging config … */ }
}
```

### Frontend — `Frontend/.env.development` and `.env.production`

```bash
# .env.development (default — uses the Vite proxy in vite.config.ts)
VITE_API_BASE_URL=http://localhost:5279

# .env.production (set at build time for non-local deployments)
VITE_API_BASE_URL=https://your-backend.example.com
```

The Vite dev server proxies `/api/*` to `http://localhost:5279` so the frontend can just call `/api/ups/current` regardless of environment.

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

---

## Testing

### Frontend

```bash
cd Frontend

npm run typecheck    # tsc -b --noEmit — strict mode, no `any`
npm run test:run     # vitest run — 47 unit / integration / a11y tests
npm run test:coverage # vitest run --coverage (v8 reporter)
npm run lint         # ESLint
npm run build        # tsc -b && vite build
```

Coverage thresholds (enforced via `vitest.config.ts`): **70% lines / 60% branches**.

CI runs typecheck + test + build + a **bundle-size budget** (gzipped main chunk ≤ 256 KB) on every push to `main` — see `.github/workflows/frontend-ci.yml`.

### Backend

```bash
cd Backend
dotnet test                                    # all test projects
dotnet test tests/VoltSense.Application.Tests  # just one layer
dotnet run --project tools/DbSmokeTest         # manual DB connectivity check
```

---

## Build & deployment

### Render (free tier)

The repo ships a `render.yaml` Blueprint:

```bash
# Render → New → Blueprint → pick this repo → apply
```

Render will provision:

- `voltsense-db` — managed PostgreSQL (free tier)
- `voltsense-backend` — Docker service, rootDir `Backend/`, exposed on port 8080

The backend reads `ConnectionStrings__DefaultConnection` from the database's `fromDatabase` reference.

### Manual Docker

```bash
docker compose up -d --build
# Backend on http://localhost:5279, Postgres on localhost:5432
```

For a complete local production-grade walkthrough, see [`Docker and Deploy.md`](Docker and Deploy.md).

---

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

### CORS errors in the browser console

The backend only allows origins `http://localhost:5173` and `http://127.0.0.1:5173` (see `Program.cs → CorsPolicies.LocalFrontend`). If you're serving the frontend from a different origin (custom port, deployed URL), add it there.

### Frontend can't reach the backend after a deploy

`VITE_API_BASE_URL` is **baked at build time** — Vite inlines it into the bundle. If you change the backend URL you must rebuild:

```bash
cd Frontend
VITE_API_BASE_URL=https://my-backend.example.com npm run build
```

### Bundle size budget fails in CI

The gzipped main bundle is capped at **256 KB**. If you cross the line you'll see:

```
::error::Bundle is XXX bytes (limit 256000)
```

Common culprits: pulling in a date library that already exists in `date-fns`, importing the full `@microsoft/signalr` package instead of the `/dist/esm` entry, or adding a chart library on top of `recharts`. Code-splitting via `React.lazy` is the standard remedy.

---

## Contributing

This project follows a **specification-driven** workflow: `PRD.md` is the source of truth for *what*; `backend.md` and `frontend.md` are the step-by-step guides for *how*. Every phase ends with tests + CI green.

### Before opening a PR

1. **Frontend:** `npm run typecheck && npm run test:run && npm run build` all green.
2. **Backend:** `dotnet test` green; add or update xUnit tests for any behaviour change.
3. **No new paid / proprietary dependencies.** Everything stays free & open.
4. **No fabricated values.** The frontend must show `"Unavailable"` for any `null`/missing field, never zero.

### Commit message style

Conventional Commits, scoped to the layer:

```
feat(frontend): add custom range selector to history page
fix(backend): handle UPS hot-plug within a polling cycle
docs(readme): document CORS configuration
```

---

## License

MIT. See `LICENSE` if/when added — until then, the intent is MIT.

---

## Acknowledgements

- [HidSharp](https://www.zer7.com/software/hidsharp) — pure-managed HID access that makes Windows plug-and-play UPS support tractable.
- [SignalR](https://learn.microsoft.com/en-us/aspnet/core/signalr/introduction) — the realtime backbone.
- [shadcn/ui](https://ui.shadcn.com/) — the design language for the cards / badges / tabs (we ship the primitives directly, not the registry).
- The open-source UPS community — for documenting the HID reports that make driverless monitoring possible.
