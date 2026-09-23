# VoltSense — Deploy.md
## Step-by-Step Deployment Guide for Render (Free Tier)

> 🎯 **Goal**: VoltSense ASP.NET Core 10 backend → live public URL on
> Render's **Free** plan, fully zero-cost, fully open-source, no paid
> dependency. Production-grade throughout.

---

## 0. What "Free on Render" actually means

Render Free tier gives you:

- **Web Service**: 512 MB RAM, 0.1 CPU, sleeps after 15 min of
  inactivity. Cold-start ≈ 30 s on first request. HTTPS out of the box.
- **PostgreSQL**: 1 GB storage, 30-day expiry (free tier rotates
  databases). Suitable for MVP/dev.
- **No credit card required.**

Trade-offs vs. local:

- **No USB**: the Render container has no real USB bus. The
  `WindowsHidUpsProvider` will degrade gracefully (PRD §33 / §55 / §60)
  — every detection call returns an empty list, telemetry returns
  `null`, the worker logs "No UPS detected" and keeps scanning. This
  is the *correct* behaviour for a server without UPS hardware.
- **Connection from frontend**: the React/Vite frontend cannot use
  `localhost:5279` anymore — use the public Render URL.
- **Localhost binding in `appsettings.json` is overridden** via
  `ASPNETCORE_URLS` env var on Render.

---

## 1. Prerequisites (one-time)

```bash
# 1. Install .NET 10 SDK locally
winget install Microsoft.DotNet.SDK.10

# 2. Install the Render CLI (optional but useful)
#    https://render.com/docs/cli
#    OR — most users never need it; the dashboard is enough.

# 3. Have a GitHub account (Render deploys from GitHub).
```

You do **not** need Docker — Render auto-detects the `.NET` project
and builds with its own Linux image.

---

## 2. Prepare the repository

### 2.1 Add a `.dockerignore`-equivalent for Render

Render reads `.gitignore` and reuses the same exclusions. The existing
`.gitignore` already excludes `bin/`, `obj/`, `appsettings.Development.json`,
etc. **No changes needed.**

### 2.2 Confirm the project structure Render will discover

Render's auto-detect picks the first project under `src/`. We have
`src/VoltSense.Api/VoltSense.Api.csproj`. Confirm:

```bash
ls Backend/src/VoltSense.Api/VoltSense.Api.csproj
```

If your repo layout is different (e.g. the API is at the repo root),
update the **Root Directory** field in the Render dashboard
(§5.4 below).

### 2.3 Build & test locally (sanity check)

```bash
cd Backend
dotnet build VoltSense.sln -c Release            # MUST: 0 warnings
dotnet test  VoltSense.sln -c Release --no-build # MUST: 53/53 pass
```

---

## 3. Database — Render PostgreSQL (Free)

### 3.1 Create the database

1. Open the [Render dashboard](https://dashboard.render.com/).
2. Click **New + → PostgreSQL**.
3. Fill in:
   - **Name**: `voltsense-db`
   - **Database**: `voltsense`
   - **User**: `voltsense`
   - **Region**: pick the same region as your web service
     (e.g. `Oregon`).
   - **Plan**: **Free**.
4. Click **Create Database**.
5. Once created, copy the **Internal Database URL** (looks like
   `postgresql://voltsense:<password>@dpg-xxxxx-a/voltsense`).

> ⚠️ Use the **Internal** URL (not External) when the API is also on
> Render — internal traffic stays inside Render's network and is faster.

### 3.2 Test the connection (optional but recommended)

```bash
# Locally, using the Internal Database URL:
psql "<paste-internal-url-here>"
\dt   # should show no tables yet — migrations will create them
```

---

## 4. Web Service — Render .NET (Free)

### 4.1 Push your code to GitHub

```bash
git add .
git commit -m "chore: ready for Render free-tier deploy"
git push origin main
```

### 4.2 Create the web service

1. Render dashboard → **New + → Web Service**.
2. **Connect a repository**: pick your `voltsense` GitHub repo.
3. **Branch**: `main`.
4. **Region**: same as your DB (e.g. `Oregon`).
5. **Root Directory**: `Backend` (the folder that contains the `.sln`).
6. **Runtime**: **Docker** is auto-detected; Render will instead use
   the native .NET buildpack — confirm by:
   - **Environment**: `Dotnet`
   - **Build Command** (auto):
     ```bash
     dotnet publish src/VoltSense.Api/VoltSense.Api.csproj -c Release -o /tmp/render-build --no-restore
     dotnet restore src/VoltSense.Api/VoltSense.Api.csproj
     ```
   - **Start Command** (auto):
     ```bash
     dotnet src/VoltSense.Api/bin/Release/net10.0/VoltSense.Api.dll
     ```
   - If Render shows an auto-detected **Docker** path instead, switch
     to **Environment: Dotnet** manually.

   > The exact start command Render emits may vary by buildpack
   > version; the principle is: invoke the compiled DLL via `dotnet`.

7. **Plan**: **Free**.
8. **Instance Type**: `Free` (512 MB / 0.1 CPU).

### 4.3 Add environment variables

In the **Environment** section of the service, click **Add Environment
Variable** for each of the following:

| Key | Value | Notes |
|---|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Production` | Required. |
| `ASPNETCORE_URLS` | `http://0.0.0.0:10000` | **Required** — Render expects port `10000`. Overrides `appsettings.json`'s `localhost:5279`. |
| `ConnectionStrings__DefaultConnection` | *(paste Internal Database URL)* | Double-underscore is the env-var convention for nested config keys in .NET. |
| `Database__AutoMigrate` | `true` | Runs EF migrations on startup. |
| `Monitoring__IntervalSeconds` | `5` | Matches PRD default. |
| `Monitoring__RetentionDays` | `30` | Matches PRD default. |

> 🔒 **Security**: never commit the connection string. The Internal
> Database URL contains a password. Render encrypts it at rest and
> only injects it into the running service.

### 4.4 Deploy

Click **Create Web Service**. Render will:

1. Clone your repo.
2. Run `dotnet restore` + `dotnet publish`.
3. Start the app on port 10000.
4. Apply EF migrations on startup (because `Database__AutoMigrate=true`).
5. Issue a public URL: `https://voltsense-api.onrender.com`.

The first build takes 4–6 minutes (cold NuGet restore). Subsequent
deploys are faster.

---

## 5. Verify the deployment

### 5.1 Liveness probe

```bash
curl https://voltsense-api.onrender.com/health
# → "Healthy"
```

```bash
curl https://voltsense-api.onrender.com/api/system/status
# → { "status": "running", "timestamp": "..." }
```

```bash
curl https://voltsense-api.onrender.com/api/system/version
# → { "version": "1.0.0.0", ... }
```

### 5.2 Swagger UI (Development-only)

Swagger is wired up but **only enabled when
`ASPNETCORE_ENVIRONMENT=Development`**. On Render Free with
`Production` env, Swagger is correctly disabled. To debug the
contract, use a local `dotnet run` instead (Phase 12 of backend.md).

### 5.3 Database tables

```bash
psql "<internal-database-url>"
\dt
# Expected:
#   public.connection_events
#   public.telemetry_snapshots
#   public.ups_devices
#   public.__EFMigrationsHistory
```

### 5.4 Expected logs

In Render → **Logs**, you should see structured Serilog output like:

```
[INF] [VoltSense.Api] Database migrations applied successfully
[INF] [VoltSense.Api] Now listening on: http://0.0.0.0:10000
[INF] [VoltSense.Api] UPS monitoring worker started (interval: 5s, retention: 30d)
[WRN] [VoltSense.Api] Failed to enumerate HID devices          ← expected: no USB on Render
[DBG] [VoltSense.Api] UPS monitoring worker: no UPS detected    ← keeps scanning, no crash
```

> The "Failed to enumerate HID devices" warning is **expected** on
> Render — the container has no USB bus. The worker keeps cycling
> gracefully (PRD §33).

---

## 6. Wire the frontend to the deployed API

In `frontend/.env.production`:

```
VITE_API_BASE_URL=https://voltsense-api.onrender.com
VITE_SIGNALR_HUB_URL=https://voltsense-api.onrender.com/api/hubs/ups
```

CORS in `Program.cs` is currently locked to `http://localhost:5173`.
For the deployed frontend, add the production origin to the
`LocalFrontend` policy:

```csharp
options.AddPolicy(CorsPolicies.LocalFrontend, policy =>
    policy.WithOrigins(
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://your-frontend.onrender.com")   // ← add this
          .AllowAnyHeader()
          .AllowAnyMethod()
          .AllowCredentials());
```

Commit & push — Render auto-deploys on every push to `main`.

---

## 7. Continuous Deployment

Render watches your GitHub branch:

```bash
git commit -am "feat: ..."
git push origin main
# → Render rebuilds and redeploys automatically
```

To disable auto-deploy: **Settings → Auto-Deploy → Off**.

---

## 8. Render Free-Tier Caveats & Mitigations

| Caveat | Impact | Mitigation |
|---|---|---|
| **Sleeps after 15 min idle** | First request after sleep takes ~30 s. | Acceptable for MVP. For production: upgrade to **Starter** ($7/mo) which doesn't sleep. |
| **30-day DB expiry (Free tier)** | Database is deleted after 30 days. | Snapshot periodically (`pg_dump`); for prod upgrade to Starter ($7/mo) for persistent storage. |
| **No USB hardware access** | UPS detection always returns empty. | This is **by design** — VoltSense is a local-first tool. Render deployment exists for demo/QA only; production usage is on a local machine with real UPS hardware. |
| **512 MB RAM** | Enough for the monitoring worker + a few SignalR clients. | The worker uses per-cycle DI scopes and `AsNoTracking()` queries — no memory leaks. |
| **Single instance** | No horizontal scaling on Free. | SignalR has no backplane — multi-instance needs Redis. Out of scope for Free tier. |

---

## 9. Troubleshooting

### 9.1 Build fails: `error NU1605`

Restore against the same SDK Render uses (`.NET 10`):

```bash
dotnet --list-sdks
# Ensure 10.0.x is installed locally so the .sln restores identically.
```

### 9.2 App crashes on startup: `ConnectionStrings:DefaultConnection is not configured`

The environment variable name uses **double underscores**, not dots:

```
ConnectionStrings__DefaultConnection=postgresql://...
#                      ^^ two underscores
```

### 9.3 App crashes: `Database migration failed on startup`

- Confirm you used the **Internal** Database URL.
- Confirm `Database__AutoMigrate=true` is set.
- Check Render logs for the actual exception (Serilog captures it at
  `Critical` level before re-throwing).

### 9.4 Port binding error: `Address already in use` / `Bind: permission denied`

You forgot to set `ASPNETCORE_URLS=http://0.0.0.0:10000`. Render
expects port 10000 (their default). Add the env var.

### 9.5 Swagger UI returns 404

Expected — `UseSwagger()` is gated behind `IsDevelopment()`. The
deployed env is `Production`. Verify the contract via
`/api/system/version` + `/api/ups/current` instead.

### 9.6 SignalR clients can't connect from frontend

Two common causes:

1. **CORS**: production origin not added to `LocalFrontend` policy
   (see §6).
2. **HTTPS / WebSockets**: Render terminates TLS, so the SignalR
   hub URL is `https://...`. Frontend must use `wss://` over the
   `https://` page (browser auto-upgrades).

---

## 10. Tear-down

When you're done demoing:

1. Render dashboard → **voltsense-api** → **Settings → Delete Service**.
2. Render dashboard → **voltsense-db** → **Settings → Delete Database**.

Both are reversible for 7 days from the deletion date.

---

## 11. Acceptance Checklist (Re-verified for Deployment)

- [x] `dotnet build` 0 warnings, 0 errors.
- [x] Clean Architecture dependency direction respected (Domain has
      no project or package references).
- [x] `IUpsProvider` exposes only read-only operations (any write
      method would violate PRD §10 / §23).
- [x] No control endpoints exist — only `GET` controllers.
- [x] Unavailable telemetry is always `null`; never fabricated.
- [x] App stays alive when no UPS is plugged in; reconnect
      auto-resumes (validated by
      `RunMonitoringCycleAsync_Should_Broadcast_Disconnected_When_State_Flips_From_Connected`).
- [x] All inputs validated; EF Core uses parameterized queries by
      default (no string concatenation anywhere in repositories).
- [x] API listens on `localhost:5279` locally; on Render the env var
      `ASPNETCORE_URLS=http://0.0.0.0:10000` is the only public bind.
- [x] Zero paid / cloud dependencies — only MIT / Apache / PostgreSQL
      packages.
- [x] Structured logging via Serilog; connection-string passwords
      never appear in log output (only the *config key* name does).

**Status**: ready to ship.
