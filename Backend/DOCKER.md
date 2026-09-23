# VoltSense — Docker Guide

Production-grade Docker artefacts for the VoltSense .NET 10 backend.

## Layout

```
Backend/
├── Dockerfile                       # multi-stage build, chiseled runtime
├── .dockerignore                    # excludes tests, secrets, build output
├── docker-compose.yml               # API + Postgres (production-shaped)
├── docker-compose.override.yml      # auto-merged for local dev only
└── src/
    └── VoltSense.Api/
```

## Build

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
  -e ASPNETCORE_URLS=http://+:10000 \
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

## Image size optimisation

The Dockerfile uses the **chiseled** ASP.NET base image:

| Image variant                              | Approx size |
|--------------------------------------------|-------------|
| `mcr.microsoft.com/dotnet/aspnet:10.0`     | ~110 MB     |
| `mcr.microsoft.com/dotnet/aspnet:10.0-alpine` | ~45 MB    |
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

## Render / Railway / Fly deployment

Any container platform that accepts a Dockerfile works:

- **Render**: New → Web Service → pick this repo → **Environment: Docker**
  → Render reads the `Dockerfile` automatically. Set
  `ConnectionStrings__DefaultConnection` in the env-var panel to your
  Render Postgres internal URL.
- **Railway**: New Project → Deploy from GitHub → set the same env
  vars.
- **Fly.io**: `fly launch --dockerfile Backend/Dockerfile`.

See `../Deploy.md` for the full Render walk-through.

## Troubleshooting

### `error NU1605: Detected package downgrade`

Your `Directory.Packages.props` (if any) or one project pins an older
version of a dependency that the API requires. Always build with the
same .NET SDK version the image uses (`10.0`).

### Container exits immediately

```bash
docker logs voltsense-api
```

Look for a `FATAL` line. The most common cause is a missing
`ConnectionStrings__DefaultConnection` env var.

### Migrations fail on startup

Verify Postgres is reachable from the container:

```bash
docker exec -it voltsense-api sh        # only works on non-chiseled images
# From another shell:
docker exec voltsense-db pg_isready -U voltsense
```

### USB HID does not work inside the container

By design. The WindowsHidUpsProvider reads from the **host's** USB bus
via HidSharp; the Docker container has no USB bus. The provider logs
"Failed to enumerate HID devices" once at warning level, then the
worker keeps cycling silently — this is the documented graceful
degradation path (PRD §33 / §55 / §60).

If you need real hardware access, run the API on the host with
`dotnet run`, not in Docker.
