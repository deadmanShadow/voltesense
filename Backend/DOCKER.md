# VoltSense — Docker Guide

Production-grade Docker artefacts for the VoltSense .NET 10 backend,
optimised for **Render's free-tier deployment**.

## Layout

```
Repo root/
├── render.yaml                       # ⭐ Render blueprint (one-click deploy)
└── Backend/
    ├── Dockerfile                    # multi-stage build, chiseled runtime
    ├── .dockerignore                 # excludes tests, secrets, build output
    ├── docker-compose.yml            # API + Postgres (production-shaped)
    ├── docker-compose.override.yml   # auto-merged for local dev only
    ├── DOCKER.md                     # this file
    └── src/
        └── VoltSense.Api/
```

## ⭐ One-click deploy to Render (recommended)

The fastest path: Render reads `render.yaml` and provisions everything
(Postgres + Web Service + secret wiring) for you in a single step.

### Steps

1. Push this repo to GitHub (already done).
2. Open https://dashboard.render.com/.
3. Click **New + → Blueprint**.
4. Connect your GitHub account and select the `voltesense` repo.
5. Click **Apply**.

Render will:

- Provision a free PostgreSQL instance (`voltsense-db`).
- Provision a free Web Service (`voltsense-api`) using this Dockerfile.
- Auto-inject `ConnectionStrings__DefaultConnection` from the DB to
  the web service (via the `fromService` directive in `render.yaml`).
- Set `ASPNETCORE_URLS=http://0.0.0.0:10000` (Render's required port).
- Build & deploy on every push to `main` (`autoDeploy: true`).
- Monitor `/health` for readiness (`healthCheckPath: /health`).

### Verify

```bash
# Wait ~5 minutes for the first build.
# Find your URL in the Render dashboard (voltsense-api → top of page).

curl https://voltsense-api.onrender.com/api/system/status
# → {"status":"running","timestamp":"..."}

curl https://voltsense-api.onrender.com/api/system/version
# → {"version":"1.0.0.0",...}
```

## Build locally (sanity check)

```bash
# From the Backend/ directory:
docker build -t voltsense-api:latest -f Dockerfile .

# Verify the image:
docker inspect voltsense-api:latest | grep -E "User|Architecture"
# Architecture: amd64
# User: app                      <-- non-root, courtesy of chiseled base
```

## Run (single container, with host-side Postgres)

```bash
docker run --rm -d \
  --name voltsense-api \
  -p 127.0.0.1:10000:10000 \
  -e ConnectionStrings__DefaultConnection="Host=host.docker.internal;Port=5432;Database=voltsense;Username=voltsense;Password=dev" \
  voltsense-api:latest

curl http://127.0.0.1:10000/api/system/status
# → {"status":"running","timestamp":"..."}
```

## Run (full stack with `docker compose`)

```bash
docker compose up -d --build
docker compose ps                   # both services "healthy"
docker compose logs -f api          # structured Serilog output
curl http://127.0.0.1:10000/health
curl http://127.0.0.1:10000/api/ups/current

# Tear down:
docker compose down                 # keeps the named volume
docker compose down -v              # nukes the volume too
```

## Why the Dockerfile is Render-friendly

| Render requirement                                  | How this Dockerfile meets it |
|----------------------------------------------------|------------------------------|
| Listens on `0.0.0.0:10000`                         | `ASPNETCORE_URLS=http://+:10000` baked into the image |
| Dockerfile at repo-root or under `rootDir`         | `rootDir: Backend` in `render.yaml` |
| `EXPOSE 10000` so Render knows the port            | `EXPOSE 10000` declared |
| Non-root user                                      | chiseled base → `app` user by default |
| Healthcheck path                                   | `render.yaml` declares `/health`; the API maps `MapHealthChecks("/health")` |
| Auto-deploy from GitHub                            | `autoDeploy: true` |
| Connection string from sibling DB                  | `render.yaml` `fromService` directive |

## Image size optimisation

The Dockerfile uses the **chiseled** ASP.NET base image:

| Image variant                                       | Approx size |
|-----------------------------------------------------|-------------|
| `mcr.microsoft.com/dotnet/aspnet:10.0`              | ~110 MB     |
| `mcr.microsoft.com/dotnet/aspnet:10.0-alpine`       | ~45 MB      |
| `mcr.microsoft.com/dotnet/aspnet:10.0-alpine-chiseled` | **~30 MB** ← we use this |

A multi-stage build keeps the SDK image (huge) out of the final runtime
image. Build cache via `--mount=type=cache` keeps NuGet packages warm
across rebuilds.

## Security hardening

| Property                                | Status |
|-----------------------------------------|--------|
| Runs as **non-root** (`app`, uid 1000)  | ✅ chiseled image default |
| No shell, no package manager in runtime | ✅ chiseled image |
| Secrets excluded from build context     | ✅ `.dockerignore` blocks `appsettings.Development.json` |
| Connection string injected via env var  | ✅ `ConnectionStrings__DefaultConnection` |
| Listening port hard-coded in `EXPOSE`   | ✅ `10000` |
| `DOTNET_CLI_TELEMETRY_OPTOUT=true`      | ✅ no MS telemetry from container |
| `DOTNET_gcServer=0` (use workstation GC)| ✅ lower memory in constrained envs |

## Troubleshooting

### Build fails: `error NU1605: Detected package downgrade`

Always build with the same .NET SDK version the image uses (`10.0`).
Check `dotnet --list-sdks` matches.

### Container exits immediately

```bash
docker logs voltsense-api
```

Look for a `FATAL` line. The most common cause is a missing
`ConnectionStrings__DefaultConnection` env var.

### Migrations fail on startup

Verify Postgres is reachable from the container:

```bash
docker exec voltsense-db pg_isready -U voltsense
```

### Healthcheck fails on Render

The `/health` endpoint is mapped in `Program.cs`. If Render reports
"unhealthy", check the **Logs** tab for the actual exception. The most
common cause is a connection-string mismatch between web service and
database (verify `fromService` in `render.yaml` is wired correctly).

### USB HID does not work inside the container

By design. The `WindowsHidUpsProvider` reads from the **host's** USB
bus via HidSharp; the Docker / Render container has no USB bus. The
provider logs "Failed to enumerate HID devices" at warning level, then
the worker keeps cycling silently — this is the documented graceful
degradation path (PRD §33 / §55 / §60).

For real hardware access, run the API on the host with `dotnet run`,
not in Docker.

See `../Deploy.md` for the manual Render walk-through (without using
`render.yaml`).
