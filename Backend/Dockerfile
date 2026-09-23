# syntax=docker/dockerfile:1.7
# ============================================================================
# VoltSense — Backend Dockerfile
# ----------------------------------------------------------------------------
# Multi-stage build:
#   1. restore      — restore NuGet packages (cached independently of source)
#   2. build        — compile the solution
#   3. publish      — produce a self-contained, Release-mode app
#   4. runtime      — slim ASP.NET image that runs as a non-root user
#
# Build:
#   docker build -t voltsense-api -f Backend/Dockerfile Backend
#
# Run:
#   docker run --rm -p 10000:10000 \
#     -e ConnectionStrings__DefaultConnection="Host=db;..." \
#     -e ASPNETCORE_URLS=http://+:10000 \
#     voltsense-api
#
# Notes:
#   - Targets .NET 10 (LTS).
#   - Runs as the built-in non-root `app` user (uid 1000).
#   - Uses the official Microsoft "chiseled" base for the smallest attack
#     surface and ~5× smaller image vs. the full runtime image.
# ============================================================================


# ---------------------------------------------------------------------------
# Stage 1 — restore
# ---------------------------------------------------------------------------
# Cached separately so source-only changes don't re-download every package.
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS restore
WORKDIR /src

# Copy ONLY the project files first so the layer cache holds restore output
# whenever only source files change.
COPY src/VoltSense.Domain/VoltSense.Domain.csproj                 src/VoltSense.Domain/
COPY src/VoltSense.Application/VoltSense.Application.csproj       src/VoltSense.Application/
COPY src/VoltSense.Infrastructure/VoltSense.Infrastructure.csproj src/VoltSense.Infrastructure/
COPY src/VoltSense.Api/VoltSense.Api.csproj                       src/VoltSense.Api/

RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet restore src/VoltSense.Api/VoltSense.Api.csproj \
        --runtime linux-musl-x64 \
        /p:RestoreUseStaticGraphEvaluation=true


# ---------------------------------------------------------------------------
# Stage 2 — build
# ---------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
WORKDIR /src

# Copy the rest of the source. The project files were copied above so this
# layer invalidates whenever any source file changes.
COPY src/ src/

# Apply the restored NuGet packages from the previous stage via a copy-from.
COPY --from=restore /src/src src/

RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet build src/VoltSense.Api/VoltSense.Api.csproj \
        -c Release \
        --no-restore \
        /p:UseAppHost=false


# ---------------------------------------------------------------------------
# Stage 3 — publish
# ---------------------------------------------------------------------------
FROM build AS publish
WORKDIR /src

RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet publish src/VoltSense.Api/VoltSense.Api.csproj \
        -c Release \
        -o /app/publish \
        --no-restore \
        --no-build \
        /p:UseAppHost=false \
        /p:PublishTrimmed=false \
        /p:PublishSingleFile=false


# ---------------------------------------------------------------------------
# Stage 4 — runtime
# ---------------------------------------------------------------------------
# Use the chiseled ASP.NET runtime image: no shell, no package manager,
# non-root by default — minimal CVE surface.
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine-chiseled AS runtime

# OCI labels — picked up by `docker inspect`, image registries, Render,
# Railway, Fly, etc.
LABEL org.opencontainers.image.title="VoltSense API" \
      org.opencontainers.image.description="Read-only UPS monitoring backend (ASP.NET Core 10)" \
      org.opencontainers.image.source="https://github.com/deadmanShadow/voltesense" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.vendor="VoltSense" \
      org.opencontainers.image.authors="VoltSense Contributors"

# The chiseled image ships as the built-in non-root `app` user (uid 1000).
# We don't need USER directive; the image's default is already non-root.
WORKDIR /app

# Copy the published artefacts from the publish stage.
COPY --from=publish --chown=app:app /app/publish .

# Render/Railway/Fly all default to port 10000 in production. Bind on the
# wildcard address so the container listens on all interfaces inside its
# network namespace.
ENV ASPNETCORE_URLS=http://+:10000 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true \
    DOTNET_NOLOGO=true \
    DOTNET_CLI_TELEMETRY_OPTOUT=true \
    DOTNET_gcServer=0 \
    DOTNET_GCConserveMemory=5 \
    DOTNET_EnableDiagnostics=0

EXPOSE 10000

# HEALTHCHECK against the /health endpoint that Program.cs maps.
# Note: chiseled images have no curl/wget — use a small .NET probe or rely
# on the orchestrator's httpGet probe. We omit HEALTHCHECK here and let
# docker-compose / Render define their own probe.
#
# ENTRYPOINT runs the published assembly directly.
ENTRYPOINT ["dotnet", "VoltSense.Api.dll"]
