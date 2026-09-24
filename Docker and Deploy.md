# VoltSense — Docker and Deploy.md
## Backend-Only Dockerization + Free Render Deployment Guide (Beginner-Friendly, Step-by-Step)

> ⚠️ **MUST & MUST BE**: এখানে যেসব Dockerfile / config দেওয়া হচ্ছে সেগুলো অবশ্যই **industry-standard, multi-stage,
> production-grade** — কোনো unnecessary layer, কোনো root user দিয়ে runtime চালানো, কোনো hard-coded secret
> Dockerfile-এর ভেতরে রাখা যাবে না। প্রতিটি path নিচে **ঠিক যেভাবে বলা আছে ঠিক সেভাবেই** রাখতে হবে, না হলে build fail
> করবে।
>
> **স্কোপ:** এই ডকুমেন্ট শুধুমাত্র **Backend (VoltSense.Api)** Dockerize এবং deploy করা নিয়ে। Frontend এখানে
> অন্তর্ভুক্ত নয় — Frontend আলাদাভাবে (Vite dev server / আপনার পছন্দের যেকোনো static hosting) চালাবেন এবং শুধু
> এই backend-এর URL-কে `VITE_API_BASE_URL` হিসেবে পয়েন্ট করবেন।

---

## ⚠️ 0. সবচেয়ে গুরুত্বপূর্ণ একটা কথা — আগে পড়ুন

VoltSense backend-এর core purpose হলো **local, USB-এ সরাসরি কানেক্টেড একটা UPS**-কে read করা
(`WindowsHidUpsProvider` → Windows USB HID API)। Render (বা যেকোনো cloud hosting) একটা **remote Linux
container**-এ আপনার backend চালায় — সেই container-এর কাছে আপনার কম্পিউটারে প্লাগ করা UPS-এর **কোনো physical
access নেই**। তাই:

- **Render-এ ডিপ্লয় করা backend কখনো আপনার আসল UPS টেলিমেট্রি পড়তে পারবে না** — `IUpsProvider.DetectDevicesAsync()`
  সবসময় empty list রিটার্ন করবে, `/api/ups/current` সবসময় `404 No UPS detected` দেবে। এটা bug না, এটা expected/
  correct behavior — কারণ VoltSense backend আসলে **local-first**, cloud SaaS না।
- Render deployment এখানে থাকছে কারণ (ক) **পোর্টফোলিও/ডেমো** হিসেবে API লাইভ URL-এ দেখানোর জন্য, (খ) REST API /
  DB layer / SignalR hub স্বতন্ত্রভাবে টেস্ট করার জন্য, (গ) ভবিষ্যতে `NetworkUpsProvider` (PRD §9) বানালে তখন
  সত্যিকারের remote monitoring সম্ভব হবে।
- **বাস্তব ব্যবহারের জন্য** backend সবসময় সেই কম্পিউটারেই চালাতে হবে যেখানে UPS টা USB দিয়ে প্লাগ করা — সেটা local
  Docker দিয়ে হোক বা `dotnet run` দিয়ে।

---

## Phase 1. Folder Structure (MUST — এই paths-এ-ই ফাইলগুলো রাখতে হবে)

আপনার আগের Backend.md অনুযায়ী তৈরি প্রজেক্ট স্ট্রাকচারের উপর নিচের ফাইলগুলো **যোগ** করবেন:

```text
VoltSense/                              ← project root (Git repo root)
│
├── Backend/
│   ├── VoltSense.sln
│   ├── Dockerfile                      ← 🆕 এখানে রাখুন
│   ├── .dockerignore                   ← 🆕 এখানে রাখুন
│   └── src/
│       ├── VoltSense.Domain/
│       ├── VoltSense.Application/
│       ├── VoltSense.Infrastructure/
│       └── VoltSense.Api/
│
├── Frontend/                           ← এই ডকুমেন্টে touch করা হচ্ছে না
│
├── docker-compose.yml                  ← 🆕 root-এ রাখুন (Backend + Postgres, local testing)
├── .env.example                        ← 🆕 root-এ রাখুন
└── render.yaml                         ← 🆕 root-এ রাখুন (Render Blueprint — optional কিন্তু recommended)
```

---

## Phase 2. Backend Dockerfile — `Backend/Dockerfile`

```dockerfile
# ============================================================
# Backend/Dockerfile
# Multi-stage build: SDK for building, slim ASP.NET runtime for running.
# MUST: never ship the SDK image to production — it's ~3x larger than needed.
# ============================================================

# ---------- Stage 1: Build ----------
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
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
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app

# MUST — never run the container as root in production
RUN addgroup -S voltsense && adduser -S voltsense -G voltsense
USER voltsense

COPY --from=build --chown=voltsense:voltsense /app/publish .

# Render (and most container platforms) inject a $PORT env var at runtime.
# Default to 8080 for local `docker run` / docker-compose use.
ENV ASPNETCORE_ENVIRONMENT=Production
ENV DOTNET_RUNNING_IN_CONTAINER=true
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["/bin/sh", "-c", "ASPNETCORE_URLS=http://+:${PORT} dotnet VoltSense.Api.dll"]
```

### `Backend/.dockerignore`

```text
**/bin/
**/obj/
**/.vs/
**/.vscode/
**/*.user
**/.git
**/.gitignore
**/tests/
appsettings.Development.json
*.md
```

> **কেন `.dockerignore` MUST:** এটা ছাড়া local `bin/`, `obj/` ফোল্ডারগুলো build context-এর সাথে পাঠানো হবে,
> ফলে build ধীর হবে এবং কখনো কখনো ভুল (stale) binary কপি হয়ে যেতে পারে।

---

## Phase 3. CORS — এখনই ঠিক করে রাখুন (MUST)

Frontend আলাদাভাবে চলবে (local Vite dev server অথবা অন্য কোনো hosting), তাই backend-এর CORS policy-তে সেই
origin(গুলো) allow করে রাখতে হবে। `Backend/src/VoltSense.Api/Program.cs`:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowedOrigins", policy =>
        policy.WithOrigins(
                "http://localhost:5173",                 // local frontend dev server
                "https://your-frontend-domain.example"    // 🆕 আপনার frontend যেখানেই host হোক, সেই URL বসান
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});
// ...
app.UseCors("AllowedOrigins");
```

> Frontend hosting এখনো ঠিক না করে থাকলে আপাতত শুধু `http://localhost:5173` রেখে দিন, পরে যখন frontend
> deploy করবেন তখন এই list-এ সেই URL যোগ করে backend redeploy করলেই হবে।

---

## Phase 4. `docker-compose.yml` (root) — Local Backend + Postgres Testing

```yaml
# docker-compose.yml — রাখুন VoltSense/ (project root) এ
services:
  postgres:
    image: postgres:16-alpine
    container_name: voltsense-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: voltsense
      POSTGRES_USER: voltsense_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-voltsense_local_pw}
    ports:
      - "5432:5432"
    volumes:
      - voltsense-db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U voltsense_user -d voltsense"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build:
      context: ./Backend
      dockerfile: Dockerfile
    container_name: voltsense-backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      ConnectionStrings__DefaultConnection: >-
        Host=postgres;Port=5432;Database=voltsense;Username=voltsense_user;Password=${POSTGRES_PASSWORD:-voltsense_local_pw}
      Monitoring__IntervalSeconds: 5
      Monitoring__RetentionDays: 30
      PORT: 8080
    ports:
      - "5279:8080"
    # Note: USB HID device access from inside a Linux container requires the host to
    # expose the device and the provider to target Linux (future LinuxUpsProvider, PRD §39).
    # For the Windows-HID MVP provider, run `dotnet run` directly on the host instead of Docker
    # if you need real UPS detection during local development.

volumes:
  voltsense-db-data:
```

### `.env.example` (root)

```text
POSTGRES_PASSWORD=change_me_locally
```

### Local run কমান্ড

```bash
cd VoltSense
cp .env.example .env      # তারপর .env-এ আসল পাসওয়ার্ড বসান
docker compose up --build

# Backend API/Swagger → http://localhost:5279/swagger
# Postgres → localhost:5432
```

তারপর frontend আলাদাভাবে `Frontend/` ফোল্ডারে গিয়ে `npm run dev` দিয়ে চালান এবং `.env`-এ
`VITE_API_BASE_URL=http://localhost:5279` সেট করুন।

> **মনে রাখবেন (§0-এ যা বলা হয়েছে):** এই docker-compose setup-এ backend একটা Linux container-এ চলে, তাই
> `WindowsHidUpsProvider` কোনো real UPS পাবে না। API/DB/SignalR layer টেস্ট করার জন্য এটা perfect, কিন্তু
> **real UPS মনিটরিং টেস্ট করতে হলে backend সরাসরি Windows host-এ `dotnet run` দিয়ে চালান**, শুধু Postgres-টা
> Docker-এ রেখে দিতে পারেন (`docker compose up postgres`)।

---

## Phase 5. Local Docker Commands Cheat-Sheet

```bash
# শুধু build (run ছাড়া)
docker compose build

# Background-এ চালানো
docker compose up -d

# Logs দেখা
docker compose logs -f backend

# বন্ধ করা
docker compose down

# বন্ধ করে data volume সহ মুছে ফেলা (fresh DB চাইলে)
docker compose down -v

# শুধু backend rebuild
docker compose up -d --build backend
```

---

## Phase 6. Render-এ Deploy করার আগে প্রস্তুতি

1. GitHub-এ পুরো `VoltSense/` রিপোজিটরি push করুন (অন্তত `Backend/` ফোল্ডার + `docker-compose.yml` সহ)।
2. [render.com](https://render.com) -এ একটা ফ্রি অ্যাকাউন্ট খুলুন — **credit card লাগবে না** ফ্রি টায়ারের জন্য।
3. GitHub অ্যাকাউন্ট Render-এর সাথে connect করুন (Dashboard → Account Settings → GitHub → Connect)।

---

## Phase 7. Render Free Tier — নিয়মাবলি (আগে জেনে নিন, MUST)

Render-এর policy পরিবর্তন হতে পারে — deploy করার আগে সবসময় [render.com/pricing](https://render.com/pricing)
চেক করে নিশ্চিত হবেন। বর্তমান (2026) নিয়ম অনুযায়ী:

| জিনিস | ফ্রি টায়ারে যা হয় |
|---|---|
| **Web Service (Backend)** | প্রতি workspace-এ মাসে **750 instance-hour ফ্রি**। 15 মিনিট ট্র্যাফিক না পেলে **spin down** হয়ে যায়; পরের রিকোয়েস্টে **~30–60 সেকেন্ড cold-start delay** |
| **PostgreSQL Database** | ফ্রি Postgres **তৈরির 30 দিন পর expire** হয়ে যায় (14 দিনের grace period-এ upgrade না করলে ডেটাসহ মুছে যায়) — **production-এর জন্য অনুপযুক্ত** |
| **Bandwidth** | মাসে 100 GB আউটবাউন্ড ইনক্লুডেড |
| **Build Minutes** | মাসে ~500 minutes ইনক্লুডেড |
| **Credit Card** | ফ্রি টায়ার শুরু করতে লাগে না |

---

## Phase 8. Step 1 — PostgreSQL ডেটাবেস তৈরি করুন

1. Render Dashboard → **New +** → **PostgreSQL**।
2. পূরণ করুন:
   - **Name:** `voltsense-db`
   - **Database:** `voltsense`
   - **User:** `voltsense_user`
   - **Region:** backend-এর মতো একই region বেছে নিন (latency কমাতে) — যেমন Singapore/Oregon।
   - **Instance Type:** **Free**
3. **Create Database** ক্লিক করুন।
4. তৈরি হয়ে গেলে, database page-এ যান এবং **Internal Database URL** কপি করে রাখুন (এই ফরম্যাটে থাকবে:
   `postgres://user:password@host/dbname`) — পরের ধাপে backend-এর env variable-এ লাগবে।

---

## Phase 9. Step 2 — Backend Docker Web Service তৈরি করুন

1. Render Dashboard → **New +** → **Web Service**।
2. আপনার GitHub রিপো সিলেক্ট করুন (`VoltSense`)।
3. Settings পূরণ করুন:

| Field | Value |
|---|---|
| **Name** | `voltsense-backend` |
| **Region** | Database-এর মতো একই region |
| **Branch** | `main` |
| **Root Directory** | `Backend` |
| **Runtime** | **Docker** |
| **Dockerfile Path** | `./Dockerfile` (Root Directory-এর relative, তাই `Backend/Dockerfile` স্বয়ংক্রিয়ভাবে ধরবে) |
| **Instance Type** | **Free** |

4. **Environment Variables** যোগ করুন (Advanced → Add Environment Variable):

| Key | Value |
|---|---|
| `ConnectionStrings__DefaultConnection` | Step 8-এ কপি করা Postgres connection string-টা .NET ফরম্যাটে রূপান্তর করে দিন — নিচের নোট দেখুন |
| `Monitoring__IntervalSeconds` | `5` |
| `Monitoring__RetentionDays` | `30` |
| `ASPNETCORE_ENVIRONMENT` | `Production` |

> **Connection String রূপান্তর (MUST):** Render যা দেয় (`postgres://user:pass@host:5432/dbname`) সেটা
> .NET-এর Npgsql ফরম্যাটে বদলে দিন:
> ```text
> Host=<host>;Port=5432;Database=<dbname>;Username=<user>;Password=<pass>;SSL Mode=Require;Trust Server Certificate=true
> ```
> Render-এর Postgres সবসময় SSL দরকার হয়, তাই `SSL Mode=Require` **অবশ্যই** যোগ করতে হবে, না হলে connection fail
> করবে।

5. **Create Web Service** ক্লিক করুন। Render স্বয়ংক্রিয়ভাবে `Backend/Dockerfile` দিয়ে build শুরু করবে
   (কোনো আলাদা "Build Command" লাগবে না — Docker deployment-এ পুরো build process Dockerfile-এর ভেতরেই থাকে)।
6. Build/deploy শেষ হলে আপনি একটা URL পাবেন, যেমন: `https://voltsense-backend.onrender.com`

---

## Phase 10. Optional — `render.yaml` দিয়ে One-Click Blueprint Deploy (Backend + DB)

Root-এ এই ফাইল রাখলে Render Dashboard-এ **New + → Blueprint** দিয়ে backend + DB একসাথে সেটআপ করা যায় — বারবার
ম্যানুয়ালি সার্ভিস তৈরি করতে হয় না।

```yaml
# render.yaml — VoltSense/ (root)-এ রাখুন
services:
  - type: web
    name: voltsense-backend
    runtime: docker
    plan: free
    rootDir: Backend
    dockerfilePath: ./Dockerfile
    envVars:
      - key: ConnectionStrings__DefaultConnection
        fromDatabase:
          name: voltsense-db
          property: connectionString
      - key: Monitoring__IntervalSeconds
        value: "5"
      - key: Monitoring__RetentionDays
        value: "30"
      - key: ASPNETCORE_ENVIRONMENT
        value: Production

databases:
  - name: voltsense-db
    plan: free
    databaseName: voltsense
    user: voltsense_user
```

> `fromDatabase.property: connectionString` ব্যবহার করলে Render **স্বয়ংক্রিয়ভাবে** `postgres://...`
> ফরম্যাটে কানেকশন স্ট্রিং inject করবে — সেক্ষেত্রে Program.cs-এ সেই URL-কে Npgsql ফরম্যাটে parse করার একটা ছোট
> helper লিখতে হবে, অথবা §9-এর মতো ম্যানুয়ালি Npgsql-ফরম্যাটেড string আলাদা env var হিসেবে দিন — যেটা সহজ মনে হয়।

Deploy করতে: Render Dashboard → **New +** → **Blueprint** → রিপো সিলেক্ট করুন → Render নিজে থেকে `render.yaml`
পড়ে service preview দেখাবে → **Apply**।

---

## Phase 11. Auto-Deploy on Git Push

Render ডিফল্টভাবে **Auto-Deploy চালু** রাখে — আপনি যখনই `main` ব্রাঞ্চে push করবেন, Render স্বয়ংক্রিয়ভাবে নতুন
build+deploy শুরু করবে (নতুন Docker image build হয়ে backend আপডেট হবে)। বন্ধ করতে চাইলে: Service Settings →
**Auto-Deploy** → **No**।

---

## Phase12. Deploy-এর পর যাচাই করুন (Checklist)

- [ ] Backend URL-এ গিয়ে `/api/system/status` চেক করুন — `{"status":"running", ...}` দেখাবে।
- [ ] `/api/ups/current` চেক করুন — DB connection কাজ করছে কিনা যাচাই করুন (৪০৪ আসলেও ঠিক আছে, মানে "no UPS" —
      কিন্তু ৫০০ error আসলে DB connection string ভুল)।
- [ ] Frontend (local বা যেখানেই host করুন) থেকে backend URL হিট করে দেখুন CORS error আসে কিনা।
- [ ] SignalR hub (`/api/hubs/ups`) কানেক্ট হচ্ছে কিনা browser console-এ যাচাই করুন।

---

## Phase 13. সাধারণ সমস্যা ও সমাধান (Troubleshooting)

| সমস্যা | কারণ | সমাধান |
|---|---|---|
| Backend deploy fail, `dotnet restore` error | ভুল `Root Directory` বা path | Root Directory ঠিক `Backend` আছে কিনা, আর Dockerfile-এর COPY path গুলো মিলছে কিনা চেক করুন |
| Backend চলছে কিন্তু API 500 error দেয় | DB connection string ভুল | `SSL Mode=Require` যোগ করেছেন কিনা, Render Postgres-এর হোস্ট/পাসওয়ার্ড ঠিক কপি করেছেন কিনা যাচাই করুন |
| Frontend থেকে API কল "CORS error" | Backend CORS policy-তে frontend origin নেই | §3-এর CORS কোড আপডেট করে redeploy করুন |
| প্রথম রিকোয়েস্টে backend অনেক দেরি করছে | Free tier spin-down (cold start) | স্বাভাবিক — 15 মিনিট নিষ্ক্রিয় থাকলে ঘুমিয়ে যায়, পরের রিকোয়েস্টে ~৩০–৬০ সেকেন্ড লাগবে |
| ৩০ দিন পর DB access বন্ধ | Free Postgres expiry | নতুন free DB বানান অথবা paid Starter Postgres ($7/mo)-এ upgrade করুন |
| Dashboard-এ কখনোই telemetry আসে না (even locally connected) | Backend cloud-এ চলছে, §0 | এটাই expected — real UPS মনিটরিংয়ের জন্য backend local host-এ চালান |

---

## Phase 14. Acceptance Checklist (MUST পূরণ)

- [ ] `docker compose up --build` লোকালি error ছাড়া চলে এবং backend + postgres দুটোই healthy হয়।
- [ ] Backend Dockerfile non-root user দিয়ে চলে, multi-stage, alpine-based (ছোট image size)।
- [ ] কোনো secret/password Dockerfile বা কোডে hard-code করা নেই — সব env variable দিয়ে।
- [ ] Render-এ Backend successfully deploy হয়েছে, live URL কাজ করছে, DB-র সাথে connect হচ্ছে।
- [ ] CORS ঠিকভাবে configured যাতে frontend (যেখানেই host হোক) backend API কল করতে পারে।
- [ ] দল/ব্যবহারকারী §0-এর limitation সম্পর্কে সচেতন — cloud deployment ডেমো/API-টেস্টিং-এর জন্য, real UPS
      মনিটরিং local host-এ চালাতে হবে।

---

**এই ডকুমেন্ট অনুসরণ করলে শুধু VoltSense Backend সম্পূর্ণরূপে containerized এবং Render-এ ফ্রিতে (ডেমো-লেভেলে)
live করা যাবে। Frontend আলাদাভাবে, আপনার পছন্দমতো যেকোনো জায়গায় deploy করে শুধু এই backend URL-কে
`VITE_API_BASE_URL` হিসেবে ব্যবহার করবেন। প্রতিটি Dockerfile ও config অবশ্যই production-grade মানে রাখতে হবে —
কোনো shortcut বা insecure default গ্রহণযোগ্য না।**
