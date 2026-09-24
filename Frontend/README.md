# VoltSense — Frontend

React + TypeScript + Vite implementation of the VoltSense UI.

> The full, authoritative step-by-step implementation guide is
> [`../frontend.md`](../frontend.md). **Read it first.** This README only
> orients you to what is currently scaffolded.

## Current status

| Phase | Topic | State |
|------:|-------|-------|
| 1 | Project initialization (`package.json`, `tsconfig.*`, `vite.config.ts`, `index.html`) | done |
| 2 | Tailwind + shadcn/ui configuration (`tailwind.config.ts`, `postcss.config.js`, `components.json`, `src/index.css`, `src/lib/utils.ts`) | done |
| 3 | Domain types (`src/types/telemetry.ts`, `src/types/ups.ts`) | done |
| 4 | API client & services (`src/services/*`) | next |
| 5–15 | Hooks, components, pages, shell, providers, env, error states, tests | pending |

## Folder structure (MUST match `frontend.md` §1)

```
Frontend/
├─ index.html
├─ package.json
├─ tsconfig.json
├─ tsconfig.app.json
├─ tsconfig.node.json
├─ vite.config.ts
├─ tailwind.config.ts
├─ postcss.config.js
├─ components.json
├─ .env.development
├─ .env.production
└─ src/
   ├─ main.tsx
   ├─ App.tsx
   ├─ index.css
   ├─ components/
   │  ├─ ui/                  (shadcn primitives — populated in Phase 2 via CLI)
   │  ├─ layout/              (AppShell, Sidebar, TopBar — Phase 12)
   │  └─ common/              (ConnectionBadge, EmptyState, LoadingSpinner)
   ├─ features/
   │  ├─ dashboard/{components,hooks}/
   │  ├─ ups/{hooks,types.ts}
   │  ├─ history/{components,hooks}/
   │  └─ settings/components/
   ├─ pages/AboutPage.tsx     (Phase 11)
   ├─ hooks/                  (useSignalRConnection — Phase 5)
   ├─ lib/                    (utils, formatters)
   ├─ services/               (Phase 4)
   ├─ stores/                 (connectionStore — only if needed, PRD §27)
   └─ types/                  (telemetry.ts, ups.ts — Phase 3)
```

## Local development

```bash
cd Frontend
npm install
npm run dev      # http://localhost:5173  → proxies /api to backend at :5279
npm run build    # production build → dist/
npm run preview  # serve dist/ locally
```

Required environment:

- Node.js 20 LTS+ / npm 10+
- Backend running at `http://localhost:5279` (see `Backend.md`)

## Conventions (MUST)

- TypeScript **strict mode** — no `any`, no implicit returns, exhaustive switches.
- Components never fabricate values: pass `null` through to formatters that
  render `"Unavailable"` (PRD §29, frontend.md §8).
- SignalR is the source of truth for live telemetry; REST is the fallback
  initial load only (PRD §28).
- All telemetry field names mirror backend DTOs exactly. Sync both sides on
  any change (PRD §62).
- No hardware-control UI exists anywhere (PRD §31 — read-only).
