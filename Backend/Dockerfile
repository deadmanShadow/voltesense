# ============================================================
# Backend/Dockerfile
# Multi-stage build: SDK for building, slim ASP.NET runtime for running.
# MUST: never ship the SDK image to production — it's ~3x larger than needed.
# Target framework: net10.0 (matches src/VoltSense.Api/VoltSense.Api.csproj).
# ============================================================

# ---------- Stage 1: Build ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
WORKDIR /src

# Copy only project files first — enables Docker layer caching for `dotnet restore`
# (source code changes won't invalidate this layer, so restore isn't re-run every build)
COPY VoltSense.sln ./
COPY src/VoltSense.Domain/VoltSense.Domain.csproj src/VoltSense.Domain/
COPY src/VoltSense.Application/VoltSense.Application.csproj src/VoltSense.Application/
COPY src/VoltSense.Infrastructure/VoltSense.Infrastructure.csproj src/VoltSense.Infrastructure/
COPY src/VoltSense.Api/VoltSense.Api.csproj src/VoltSense.Api/

RUN dotnet restore src/VoltSense.Api/VoltSense.Api.csproj

# Now copy the rest of the source and publish
COPY src/ src/
RUN dotnet publish src/VoltSense.Api/VoltSense.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

# ---------- Stage 2: Runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS runtime
WORKDIR /app

# 🆕 Npgsql-এর SSL/GSSAPI negotiation-এর জন্য দরকার — Alpine-এ ডিফল্টভাবে থাকে না
RUN apk add --no-cache icu-libs krb5-libs

# MUST — never run the container as root in production
RUN addgroup -S voltsense && adduser -S voltsense -G voltsense
USER voltsense

COPY --from=build --chown=voltsense:voltsense /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production
ENV DOTNET_RUNNING_IN_CONTAINER=true
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["/bin/sh", "-c", "ASPNETCORE_URLS=http://+:${PORT} dotnet VoltSense.Api.dll"]
