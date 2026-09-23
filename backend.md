# VoltSense — Backend.md
## ASP.NET Core Backend — Complete Step-by-Step Implementation Guide

> ⚠️ **MUST & MUST BE**: প্রতিটি ফাইল, প্রতিটি ক্লাস, প্রতিটি লাইন কোড অবশ্যই **Industry-Expert / Production-Grade** মানের হতে হবে —
> Clean Architecture strictly follow করতে হবে, SOLID principles মানতে হবে, proper error handling, cancellation
> token, async/await, dependency injection, nullable reference types, structured logging ব্যবহার করতে হবে।
> কোনো shortcut, "quick hack", magic string, hard-coded value গ্রহণযোগ্য না। এই নিয়ম পুরো ডকুমেন্ট জুড়ে **MUST** মানতে হবে।

এই ডকুমেন্টটি একজন AI coding agent (বা developer) কে দিলে সে শুরু থেকে শেষ পর্যন্ত VoltSense-এর ব্যাকএন্ড
সম্পূর্ণরূপে বাস্তবায়ন করতে পারবে। PRD (VoltSense v1.0) থেকে নেওয়া requirements অনুযায়ী ধাপে ধাপে (Phase-by-Phase)
implementation নির্দেশনা দেওয়া হলো।

---

## 0. Prerequisites (MUST)

- .NET SDK 10.0 (LTS) — **Industry-standard**, `dotnet --version` দিয়ে verify করুন।
- PostgreSQL 15+ (local install, free, open-source)।
- `dotnet-ef` global tool: `dotnet tool install --global dotnet-ef`
- IDE:VS Code + C# Dev Kit।
- Windows 10/11 (MVP target — USB HID API-এর জন্য)।

---

## 1. Folder Structure (MUST — ঠিক এই কাঠামোই অনুসরণ করতে হবে)

```text
Backend/
│
├── VoltSense.sln
│
├── src/
│   ├── VoltSense.Domain/
│   │   ├── VoltSense.Domain.csproj
│   │   ├── Entities/
│   │   │   ├── UpsDevice.cs
│   │   │   ├── TelemetrySnapshot.cs
│   │   │   └── ConnectionEvent.cs
│   │   ├── Enums/
│   │   │   ├── UpsStatus.cs
│   │   │   └── ConnectionType.cs
│   │   ├── ValueObjects/
│   │   │   ├── UpsTelemetry.cs
│   │   │   ├── UpsDeviceInfo.cs
│   │   │   └── UpsConnectionStatus.cs
│   │   ├── Interfaces/
│   │   │   ├── IUpsProvider.cs
│   │   │   ├── IUpsDeviceDetector.cs
│   │   │   ├── IUpsTelemetryReader.cs
│   │   │   └── IUpsRepository.cs
│   │   └── Common/
│   │       └── Result.cs
│   │
│   ├── VoltSense.Application/
│   │   ├── VoltSense.Application.csproj
│   │   ├── DTOs/
│   │   │   ├── UpsDeviceDto.cs
│   │   │   ├── TelemetryDto.cs
│   │   │   └── HistoryQueryDto.cs
│   │   ├── Interfaces/
│   │   │   ├── IUpsMonitoringService.cs
│   │   │   ├── ITelemetryBroadcaster.cs
│   │   │   └── IApplicationDbContext.cs
│   │   ├── Services/
│   │   │   ├── UpsMonitoringService.cs
│   │   │   └── TelemetryRetentionService.cs
│   │   ├── UseCases/
│   │   │   ├── GetCurrentUps/
│   │   │   ├── GetTelemetryHistory/
│   │   │   └── GetUpsList/
│   │   ├── Mappings/
│   │   │   └── UpsMappingProfile.cs
│   │   └── Validators/
│   │       └── TelemetryValidator.cs
│   │
│   ├── VoltSense.Infrastructure/
│   │   ├── VoltSense.Infrastructure.csproj
│   │   ├── Persistence/
│   │   │   ├── VoltSenseDbContext.cs
│   │   │   ├── Configurations/
│   │   │   │   ├── UpsDeviceConfiguration.cs
│   │   │   │   ├── TelemetrySnapshotConfiguration.cs
│   │   │   │   └── ConnectionEventConfiguration.cs
│   │   │   ├── Repositories/
│   │   │   │   └── UpsRepository.cs
│   │   │   └── Migrations/           (auto-generated)
│   │   ├── UPS/
│   │   │   ├── WindowsHidUpsProvider.cs
│   │   │   ├── HidDeviceScanner.cs
│   │   │   └── NutStyleTelemetryMapper.cs
│   │   ├── Hardware/
│   │   │   └── HidSharpWrapper.cs
│   │   ├── Windows/
│   │   │   └── WindowsDeviceWatcher.cs
│   │   └── Services/
│   │       └── SystemClock.cs
│   │
│   └── VoltSense.Api/
│       ├── VoltSense.Api.csproj
│       ├── Program.cs
│       ├── appsettings.json
│       ├── appsettings.Development.json
│       ├── Controllers/
│       │   ├── UpsController.cs
│       │   ├── TelemetryController.cs
│       │   ├── HistoryController.cs
│       │   └── SystemController.cs
│       ├── Hubs/
│       │   └── UpsHub.cs
│       ├── Middleware/
│       │   └── ExceptionHandlingMiddleware.cs
│       └── BackgroundServices/
│           └── UpsMonitoringWorker.cs
│
└── tests/
    ├── VoltSense.Domain.Tests/
    ├── VoltSense.Application.Tests/
    └── VoltSense.Infrastructure.Tests/
```

**Dependency direction (MUST enforce, Clean Architecture):**

```
Api → Application → Domain
Infrastructure → Application → Domain
Domain → (nothing)
```

`Domain` কোনো প্রজেক্টের উপর নির্ভর করবে না। `Infrastructure`-এ hardware/DB/SignalR-specific কোড থাকবে,
কিন্তু controller থেকে সরাসরি Infrastructure বা EF entity access করা যাবে না — সবসময় interface + DTO দিয়ে।

---

## 2. Phase 1 — Solution & Project Initialization

```bash
mkdir Backend && cd Backend
dotnet new sln -n VoltSense

dotnet new classlib -n VoltSense.Domain -o src/VoltSense.Domain
dotnet new classlib -n VoltSense.Application -o src/VoltSense.Application
dotnet new classlib -n VoltSense.Infrastructure -o src/VoltSense.Infrastructure
dotnet new webapi -n VoltSense.Api -o src/VoltSense.Api --use-controllers

dotnet sln add src/VoltSense.Domain/VoltSense.Domain.csproj
dotnet sln add src/VoltSense.Application/VoltSense.Application.csproj
dotnet sln add src/VoltSense.Infrastructure/VoltSense.Infrastructure.csproj
dotnet sln add src/VoltSense.Api/VoltSense.Api.csproj

# References (dependency direction enforce করার জন্য)
dotnet add src/VoltSense.Application reference src/VoltSense.Domain
dotnet add src/VoltSense.Infrastructure reference src/VoltSense.Application
dotnet add src/VoltSense.Infrastructure reference src/VoltSense.Domain
dotnet add src/VoltSense.Api reference src/VoltSense.Application
dotnet add src/VoltSense.Api reference src/VoltSense.Infrastructure
dotnet add src/VoltSense.Api reference src/VoltSense.Domain
```

**NuGet packages (সব free/open-source, MUST):**

```bash
# Infrastructure
dotnet add src/VoltSense.Infrastructure package Microsoft.EntityFrameworkCore
dotnet add src/VoltSense.Infrastructure package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add src/VoltSense.Infrastructure package HidSharp          # free, cross-platform USB HID library
dotnet add src/VoltSense.Infrastructure package Microsoft.Extensions.Logging.Abstractions

# Api
dotnet add src/VoltSense.Api package Microsoft.EntityFrameworkCore.Design
dotnet add src/VoltSense.Api package Swashbuckle.AspNetCore
dotnet add src/VoltSense.Api package FluentValidation.AspNetCore
dotnet add src/VoltSense.Api package Serilog.AspNetCore
dotnet add src/VoltSense.Api package Serilog.Sinks.Console
```

> `HidSharp` (MIT license, free) ব্যবহার হবে USB HID communication-এর জন্য — এটা industry-standard, cross-platform,
> এবং কোনো paid dependency নেই।

---

## 3. Phase 2 — Domain Layer (Core, framework-agnostic)

### 3.1 Enums

```csharp
// src/VoltSense.Domain/Enums/UpsStatus.cs
namespace VoltSense.Domain.Enums;

public enum UpsStatus
{
    Unknown = 0,
    Online = 1,
    OnBattery = 2,
    LowBattery = 3,
    Charging = 4,
    Discharging = 5,
    Disconnected = 6
}
```

```csharp
// src/VoltSense.Domain/Enums/ConnectionType.cs
namespace VoltSense.Domain.Enums;

public enum ConnectionType
{
    UsbHid = 0,
    Serial = 1,   // future
    Network = 2   // future
}
```

### 3.2 Value Objects (immutable — MUST, read-only telemetry snapshot represent করার জন্য)

```csharp
// src/VoltSense.Domain/ValueObjects/UpsTelemetry.cs
namespace VoltSense.Domain.ValueObjects;

/// <summary>
/// Strictly read-only, immutable snapshot of UPS telemetry at a point in time.
/// Nullable fields = "Unavailable" on this specific hardware. Never fabricate.
/// </summary>
public sealed record UpsTelemetry(
    DateTimeOffset Timestamp,
    decimal? BatteryChargePercent,
    decimal? BatteryVoltage,
    decimal? LoadPercent,
    decimal? InputVoltage,
    decimal? OutputVoltage,
    int? RuntimeSeconds,
    decimal? TemperatureCelsius,
    decimal? FrequencyHz,
    decimal? PowerWatts,
    decimal? ApparentPowerVa,
    Enums.UpsStatus Status
);
```

```csharp
// src/VoltSense.Domain/ValueObjects/UpsDeviceInfo.cs
namespace VoltSense.Domain.ValueObjects;

public sealed record UpsDeviceInfo(
    string Manufacturer,
    string Model,
    string? SerialNumber,
    string? FirmwareVersion,
    int VendorId,
    int ProductId,
    Enums.ConnectionType ConnectionType
);
```

```csharp
// src/VoltSense.Domain/ValueObjects/UpsConnectionStatus.cs
namespace VoltSense.Domain.ValueObjects;

public sealed record UpsConnectionStatus(bool IsConnected, string? Reason);
```

### 3.3 Entities

```csharp
// src/VoltSense.Domain/Entities/UpsDevice.cs
namespace VoltSense.Domain.Entities;

public class UpsDevice
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Manufacturer { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string? SerialNumber { get; set; }
    public int VendorId { get; set; }
    public int ProductId { get; set; }
    public Enums.ConnectionType ConnectionType { get; set; }
    public string? FirmwareVersion { get; set; }
    public DateTimeOffset FirstDetectedAt { get; set; }
    public DateTimeOffset LastSeenAt { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<TelemetrySnapshot> TelemetrySnapshots { get; set; } = new List<TelemetrySnapshot>();
    public ICollection<ConnectionEvent> ConnectionEvents { get; set; } = new List<ConnectionEvent>();
}
```

```csharp
// src/VoltSense.Domain/Entities/TelemetrySnapshot.cs
namespace VoltSense.Domain.Entities;

public class TelemetrySnapshot
{
    public long Id { get; private set; }
    public Guid UpsDeviceId { get; set; }
    public UpsDevice? UpsDevice { get; set; }
    public DateTimeOffset Timestamp { get; set; }
    public decimal? BatteryCharge { get; set; }
    public decimal? BatteryVoltage { get; set; }
    public decimal? LoadPercentage { get; set; }
    public decimal? InputVoltage { get; set; }
    public decimal? OutputVoltage { get; set; }
    public int? RuntimeSeconds { get; set; }
    public decimal? Temperature { get; set; }
    public decimal? Frequency { get; set; }
    public decimal? Power { get; set; }
    public Enums.UpsStatus Status { get; set; }
}
```

```csharp
// src/VoltSense.Domain/Entities/ConnectionEvent.cs
namespace VoltSense.Domain.Entities;

public enum ConnectionEventType { Connected, Disconnected, Error }

public class ConnectionEvent
{
    public long Id { get; private set; }
    public Guid UpsDeviceId { get; set; }
    public UpsDevice? UpsDevice { get; set; }
    public ConnectionEventType EventType { get; set; }
    public string? Message { get; set; }
    public DateTimeOffset OccurredAt { get; set; } = DateTimeOffset.UtcNow;
}
```

### 3.4 Core Abstraction — `IUpsProvider` (এই ইন্টারফেসই সবচেয়ে গুরুত্বপূর্ণ, MUST)

```csharp
// src/VoltSense.Domain/Interfaces/IUpsProvider.cs
using VoltSense.Domain.ValueObjects;

namespace VoltSense.Domain.Interfaces;

/// <summary>
/// The single abstraction the rest of the application talks to.
/// Only the concrete provider (e.g. WindowsHidUpsProvider) knows about real hardware.
/// STRICTLY READ-ONLY — must never expose write/control operations.
/// </summary>
public interface IUpsProvider
{
    Task<IReadOnlyList<UpsDeviceInfo>> DetectDevicesAsync(CancellationToken ct = default);
    Task<UpsDeviceInfo?> GetDeviceInfoAsync(CancellationToken ct = default);
    Task<UpsTelemetry?> GetTelemetryAsync(CancellationToken ct = default);
    Task<UpsConnectionStatus> GetConnectionStatusAsync(CancellationToken ct = default);
}
```

```csharp
// src/VoltSense.Domain/Interfaces/IUpsDeviceDetector.cs
using VoltSense.Domain.ValueObjects;

namespace VoltSense.Domain.Interfaces;

public interface IUpsDeviceDetector
{
    Task<IReadOnlyList<UpsDeviceInfo>> ScanAsync(CancellationToken ct = default);
}
```

```csharp
// src/VoltSense.Domain/Interfaces/IUpsTelemetryReader.cs
using VoltSense.Domain.ValueObjects;

namespace VoltSense.Domain.Interfaces;

public interface IUpsTelemetryReader
{
    Task<UpsTelemetry?> ReadAsync(CancellationToken ct = default);
}
```

```csharp
// src/VoltSense.Domain/Interfaces/IUpsRepository.cs
using VoltSense.Domain.Entities;

namespace VoltSense.Domain.Interfaces;

public interface IUpsRepository
{
    Task<UpsDevice?> GetActiveDeviceAsync(CancellationToken ct = default);
    Task<UpsDevice?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<UpsDevice>> GetAllAsync(CancellationToken ct = default);
    Task AddOrUpdateDeviceAsync(UpsDevice device, CancellationToken ct = default);
    Task AddTelemetrySnapshotAsync(TelemetrySnapshot snapshot, CancellationToken ct = default);
    Task AddConnectionEventAsync(ConnectionEvent evt, CancellationToken ct = default);
    Task<IReadOnlyList<TelemetrySnapshot>> GetHistoryAsync(
        Guid deviceId, DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default);
    Task<int> DeleteOldTelemetryAsync(DateTimeOffset olderThan, CancellationToken ct = default);
}
```

**⚠️ Read-only enforcement (MUST):** `IUpsProvider`-এ কোনোদিন কোনো `Shutdown()`, `Restart()`, `RunSelfTest()`,
`SetConfiguration()` ইত্যাদি মেথড যোগ করা যাবে **না**। এটা PRD §10 অনুযায়ী hard requirement।

---

## 4. Phase 3 — Infrastructure Layer: Database (PostgreSQL + EF Core)

### 4.1 DbContext

```csharp
// src/VoltSense.Infrastructure/Persistence/VoltSenseDbContext.cs
using Microsoft.EntityFrameworkCore;
using VoltSense.Domain.Entities;

namespace VoltSense.Infrastructure.Persistence;

public class VoltSenseDbContext : DbContext
{
    public VoltSenseDbContext(DbContextOptions<VoltSenseDbContext> options) : base(options) { }

    public DbSet<UpsDevice> UpsDevices => Set<UpsDevice>();
    public DbSet<TelemetrySnapshot> TelemetrySnapshots => Set<TelemetrySnapshot>();
    public DbSet<ConnectionEvent> ConnectionEvents => Set<ConnectionEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(VoltSenseDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
```

### 4.2 Entity Configuration (Fluent API — MUST, no data annotations scattered in domain)

```csharp
// src/VoltSense.Infrastructure/Persistence/Configurations/UpsDeviceConfiguration.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VoltSense.Domain.Entities;

namespace VoltSense.Infrastructure.Persistence.Configurations;

public class UpsDeviceConfiguration : IEntityTypeConfiguration<UpsDevice>
{
    public void Configure(EntityTypeBuilder<UpsDevice> builder)
    {
        builder.ToTable("ups_devices");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Manufacturer).HasMaxLength(128).IsRequired();
        builder.Property(x => x.Model).HasMaxLength(128).IsRequired();
        builder.Property(x => x.SerialNumber).HasMaxLength(128);
        builder.HasIndex(x => new { x.VendorId, x.ProductId, x.SerialNumber }).IsUnique();
        builder.HasMany(x => x.TelemetrySnapshots)
               .WithOne(x => x.UpsDevice)
               .HasForeignKey(x => x.UpsDeviceId)
               .OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(x => x.ConnectionEvents)
               .WithOne(x => x.UpsDevice)
               .HasForeignKey(x => x.UpsDeviceId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
```

```csharp
// src/VoltSense.Infrastructure/Persistence/Configurations/TelemetrySnapshotConfiguration.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VoltSense.Domain.Entities;

namespace VoltSense.Infrastructure.Persistence.Configurations;

public class TelemetrySnapshotConfiguration : IEntityTypeConfiguration<TelemetrySnapshot>
{
    public void Configure(EntityTypeBuilder<TelemetrySnapshot> builder)
    {
        builder.ToTable("telemetry_snapshots");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedOnAdd();
        // MUST — high-write time-series table: index on (device, timestamp) for fast history queries
        builder.HasIndex(x => new { x.UpsDeviceId, x.Timestamp });
    }
}
```

```csharp
// src/VoltSense.Infrastructure/Persistence/Configurations/ConnectionEventConfiguration.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VoltSense.Domain.Entities;

namespace VoltSense.Infrastructure.Persistence.Configurations;

public class ConnectionEventConfiguration : IEntityTypeConfiguration<ConnectionEvent>
{
    public void Configure(EntityTypeBuilder<ConnectionEvent> builder)
    {
        builder.ToTable("connection_events");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedOnAdd();
        builder.HasIndex(x => new { x.UpsDeviceId, x.OccurredAt });
    }
}
```

### 4.3 Connection String (MUST — never hard-code credentials, PRD §25/§35)

```json
// src/VoltSense.Api/appsettings.json
{
  "ConnectionStrings": {
    "DefaultConnection": ""
  },
  "Monitoring": {
    "IntervalSeconds": 5,
    "RetentionDays": 30
  },
  "Kestrel": {
    "Endpoints": {
      "Http": { "Url": "http://localhost:5279" }
    }
  }
}
```

```json
// src/VoltSense.Api/appsettings.Development.json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=voltsense;Username=voltsense_user;Password=CHANGE_ME_LOCAL_ONLY"
  }
}
```

> Production-এ `ConnectionStrings__DefaultConnection` environment variable দিয়ে override করতে হবে
> (PRD §25 অনুযায়ী)। কখনো secret বা password চেক-ইন করা যাবে না — `.gitignore`-এ
> `appsettings.Development.json` যোগ করার পরামর্শ দিন অথবা user-secrets ব্যবহার করুন:
> `dotnet user-secrets init` + `dotnet user-secrets set "ConnectionStrings:DefaultConnection" "..."`

### 4.4 Migrations

```bash
cd src/VoltSense.Api
dotnet ef migrations add InitialCreate \
  --project ../VoltSense.Infrastructure \
  --startup-project . \
  --output-dir Persistence/Migrations

dotnet ef database update --project ../VoltSense.Infrastructure --startup-project .
```

### 4.5 Repository Implementation

```csharp
// src/VoltSense.Infrastructure/Persistence/Repositories/UpsRepository.cs
using Microsoft.EntityFrameworkCore;
using VoltSense.Domain.Entities;
using VoltSense.Domain.Interfaces;

namespace VoltSense.Infrastructure.Persistence.Repositories;

public class UpsRepository : IUpsRepository
{
    private readonly VoltSenseDbContext _db;
    public UpsRepository(VoltSenseDbContext db) => _db = db;

    public Task<UpsDevice?> GetActiveDeviceAsync(CancellationToken ct = default) =>
        _db.UpsDevices.FirstOrDefaultAsync(x => x.IsActive, ct);

    public Task<UpsDevice?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.UpsDevices.FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task<IReadOnlyList<UpsDevice>> GetAllAsync(CancellationToken ct = default) =>
        await _db.UpsDevices.AsNoTracking().ToListAsync(ct);

    public async Task AddOrUpdateDeviceAsync(UpsDevice device, CancellationToken ct = default)
    {
        var existing = await _db.UpsDevices.FirstOrDefaultAsync(
            x => x.VendorId == device.VendorId && x.ProductId == device.ProductId &&
                 x.SerialNumber == device.SerialNumber, ct);

        if (existing is null)
        {
            device.FirstDetectedAt = DateTimeOffset.UtcNow;
            device.LastSeenAt = DateTimeOffset.UtcNow;
            device.IsActive = true;
            _db.UpsDevices.Add(device);
        }
        else
        {
            existing.LastSeenAt = DateTimeOffset.UtcNow;
            existing.FirmwareVersion = device.FirmwareVersion;
            existing.IsActive = true;
            existing.UpdatedAt = DateTimeOffset.UtcNow;
        }
        await _db.SaveChangesAsync(ct);
    }

    public async Task AddTelemetrySnapshotAsync(TelemetrySnapshot snapshot, CancellationToken ct = default)
    {
        _db.TelemetrySnapshots.Add(snapshot);
        await _db.SaveChangesAsync(ct);
    }

    public async Task AddConnectionEventAsync(ConnectionEvent evt, CancellationToken ct = default)
    {
        _db.ConnectionEvents.Add(evt);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<TelemetrySnapshot>> GetHistoryAsync(
        Guid deviceId, DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default) =>
        await _db.TelemetrySnapshots
            .AsNoTracking()
            .Where(x => x.UpsDeviceId == deviceId && x.Timestamp >= from && x.Timestamp <= to)
            .OrderBy(x => x.Timestamp)
            .ToListAsync(ct);

    public async Task<int> DeleteOldTelemetryAsync(DateTimeOffset olderThan, CancellationToken ct = default) =>
        await _db.TelemetrySnapshots.Where(x => x.Timestamp < olderThan).ExecuteDeleteAsync(ct);
}
```

---

## 5. Phase 4 — UPS Provider (Hardware Layer, USB HID, Windows)

```csharp
// src/VoltSense.Infrastructure/UPS/WindowsHidUpsProvider.cs
using HidSharp;
using Microsoft.Extensions.Logging;
using VoltSense.Domain.Enums;
using VoltSense.Domain.Interfaces;
using VoltSense.Domain.ValueObjects;

namespace VoltSense.Infrastructure.UPS;

/// <summary>
/// Windows USB HID implementation of IUpsProvider.
/// STRICTLY READ-ONLY: only issues HID "Get Feature/Input Report" calls, never "Set Feature".
/// Follows USB HID Power Device Class (PDC / usage page 0x84) where the connected UPS supports it.
/// </summary>
public sealed class WindowsHidUpsProvider : IUpsProvider
{
    // USB HID Usage Page constants (USB HID Usage Tables spec, §1.1.1 / §1.1.2)
    private const int PowerDeviceUsagePage = 0x84;   // Power Device Page
    private const int BatterySystemUsagePage = 0x85; // Battery System Page

    // Fallback allowlist for common UPS manufacturers, used only when a device's report
    // descriptor cannot be parsed (some vendors ship non-conformant descriptors). This is
    // a secondary signal, never the primary one — usage-page inspection always takes priority.
    private static readonly HashSet<int> KnownUpsVendorIds = new()
    {
        0x051D, // APC
        0x0463, // Eaton / MGE
        0x0764, // Cyber Power Systems
        0x09AE, // Tripp Lite
        0x0665, // Cypress (used by some Ippon/other UPS HID controllers)
    };

    private readonly ILogger<WindowsHidUpsProvider> _logger;
    private HidDevice? _activeDevice;
    private HidStream? _stream;

    public WindowsHidUpsProvider(ILogger<WindowsHidUpsProvider> logger) => _logger = logger;

    public Task<IReadOnlyList<UpsDeviceInfo>> DetectDevicesAsync(CancellationToken ct = default)
    {
        var devices = DeviceList.Local.GetHidDevices()
            .Where(d => IsPowerDevice(d))
            .Select(ToDeviceInfo)
            .Where(x => x is not null)
            .Select(x => x!)
            .ToList();

        return Task.FromResult<IReadOnlyList<UpsDeviceInfo>>(devices);
    }

    public async Task<UpsDeviceInfo?> GetDeviceInfoAsync(CancellationToken ct = default)
    {
        await EnsureConnectedAsync(ct);
        return _activeDevice is null ? null : ToDeviceInfo(_activeDevice);
    }

    public async Task<UpsTelemetry?> GetTelemetryAsync(CancellationToken ct = default)
    {
        await EnsureConnectedAsync(ct);
        if (_stream is null) return null;

        try
        {
            // Read-only: HID "Input Report" / "Feature Report" GET calls only.
            var report = new byte[_activeDevice!.GetMaxInputReportLength()];
            var bytesRead = await _stream.ReadAsync(report.AsMemory(0, report.Length), ct);
            return NutStyleTelemetryMapper.Map(report, bytesRead);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read UPS telemetry — device may be busy or disconnected");
            return null;
        }
    }

    public Task<UpsConnectionStatus> GetConnectionStatusAsync(CancellationToken ct = default)
    {
        var connected = _activeDevice is not null && _stream is not null;
        return Task.FromResult(new UpsConnectionStatus(connected, connected ? null : "No active UPS stream"));
    }

    private async Task EnsureConnectedAsync(CancellationToken ct)
    {
        if (_activeDevice is not null && _stream is not null) return;

        var devices = await DetectDevicesAsync(ct);
        if (devices.Count == 0) { _activeDevice = null; _stream = null; return; }

        var hid = DeviceList.Local.GetHidDevices()
            .FirstOrDefault(d => d.VendorID == devices[0].VendorId && d.ProductID == devices[0].ProductId);

        if (hid is null) return;

        try
        {
            _stream = hid.Open();
            _activeDevice = hid;
            _logger.LogInformation("UPS connected: {Manufacturer} {Model}",
                devices[0].Manufacturer, devices[0].Model);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Unable to open HID stream for detected UPS");
            _activeDevice = null;
            _stream = null;
        }
    }

    /// <summary>
    /// Identifies a real UPS/power device by inspecting its HID report descriptor's usage pages —
    /// never by assumption. A device only qualifies if it actually exposes Power Device (0x84) or
    /// Battery System (0x85) usages, or (fallback) its VID matches a known UPS manufacturer.
    /// </summary>
    private static bool IsPowerDevice(HidDevice d)
    {
        try
        {
            if (d.GetMaxFeatureReportLength() == 0 && d.GetMaxInputReportLength() == 0)
                return false; // no report capability at all — cannot be a telemetry-capable UPS

            if (HasPowerOrBatteryUsagePage(d))
                return true;

            // Fallback only — some UPS vendors ship descriptors HidSharp cannot fully parse.
            return KnownUpsVendorIds.Contains(d.VendorID);
        }
        catch (Exception)
        {
            // A device we cannot safely introspect is not treated as a UPS — fail closed.
            return false;
        }
    }

    private static bool HasPowerOrBatteryUsagePage(HidDevice d)
    {
        try
        {
            var descriptor = d.GetReportDescriptor();

            // Each DeviceItem's Usages exposes combined 32-bit values: (UsagePage << 16) | UsageId.
            // We only need the page, so shift right 16 bits.
            return descriptor.DeviceItems.Any(item =>
                item.Usages.GetAllValues().Any(usage =>
                {
                    var usagePage = (int)((usage >> 16) & 0xFFFF);
                    return usagePage == PowerDeviceUsagePage || usagePage == BatterySystemUsagePage;
                }));
        }
        catch (Exception)
        {
            // Descriptor parsing failed (malformed/vendor-specific) — let the VID fallback decide.
            return false;
        }
    }

    private static UpsDeviceInfo? ToDeviceInfo(HidDevice d)
    {
        try
        {
            return new UpsDeviceInfo(
                Manufacturer: d.GetManufacturer() ?? "Unknown",
                Model: d.GetProductName() ?? "Unknown UPS",
                SerialNumber: TryGetSerial(d),
                FirmwareVersion: null,
                VendorId: d.VendorID,
                ProductId: d.ProductID,
                ConnectionType: ConnectionType.UsbHid);
        }
        catch { return null; }
    }

    private static string? TryGetSerial(HidDevice d)
    {
        try { return d.GetSerialNumber(); } catch { return null; }
    }
}
```

```csharp
// src/VoltSense.Infrastructure/UPS/NutStyleTelemetryMapper.cs
using VoltSense.Domain.Enums;
using VoltSense.Domain.ValueObjects;

namespace VoltSense.Infrastructure.UPS;

/// <summary>
/// Maps raw HID Power Device Class report bytes into normalized, immutable UpsTelemetry.
/// Any field the device does not report MUST stay null — never fabricate (PRD §13/§62 rule 13).
/// </summary>
public static class NutStyleTelemetryMapper
{
    public static UpsTelemetry Map(byte[] report, int length)
    {
        // NOTE for implementer: exact byte offsets are device-specific (usage-page 0x84 usages:
        // RemainingCapacity, RunTimeToEmpty, ACPresent, Charging, Discharging, Voltage, PercentLoad).
        // Parse only fields confirmed present in the report descriptor of the connected UPS;
        // leave everything else null. This function must be completed/validated per-device
        // during Phase 11 hardware testing (PRD §54/§57).
        return new UpsTelemetry(
            Timestamp: DateTimeOffset.UtcNow,
            BatteryChargePercent: null,
            BatteryVoltage: null,
            LoadPercent: null,
            InputVoltage: null,
            OutputVoltage: null,
            RuntimeSeconds: null,
            TemperatureCelsius: null,
            FrequencyHz: null,
            PowerWatts: null,
            ApparentPowerVa: null,
            Status: UpsStatus.Unknown);
    }
}
```

> **নোট (MUST বোঝা জরুরি):** প্রতিটি UPS মডেলের exact HID report layout আলাদা। তাই `NutStyleTelemetryMapper`-কে
> বাস্তব হার্ডওয়্যারের বিপরীতে টেস্ট করে অবশ্যই সম্পূর্ণ করতে হবে (PRD §57 — Hardware Tests)। কোনোভাবেই placeholder
> মান রিয়েল ভ্যালু হিসেবে দেখানো যাবে না — না পাওয়া গেলে `null` → frontend-এ "Unavailable"।

---

## 6. Phase 5 — Application Layer (Use Cases, DTOs, Services)

### 6.1 DTOs

```csharp
// src/VoltSense.Application/DTOs/UpsDeviceDto.cs
namespace VoltSense.Application.DTOs;

public sealed record UpsDeviceDto(
    Guid Id, string Manufacturer, string Model, string ConnectionType,
    string? FirmwareVersion, DateTimeOffset LastSeenAt, bool IsActive);
```

```csharp
// src/VoltSense.Application/DTOs/TelemetryDto.cs
namespace VoltSense.Application.DTOs;

public sealed record TelemetryDto(
    DateTimeOffset Timestamp,
    decimal? BatteryCharge,
    decimal? BatteryVoltage,
    decimal? LoadPercentage,
    decimal? InputVoltage,
    decimal? OutputVoltage,
    int? RuntimeSeconds,
    decimal? Temperature,
    decimal? Frequency,
    decimal? Power,
    string Status);
```

### 6.2 Monitoring Service (core orchestration, used by the BackgroundService)

```csharp
// src/VoltSense.Application/Interfaces/IUpsMonitoringService.cs
namespace VoltSense.Application.Interfaces;

public interface IUpsMonitoringService
{
    Task RunMonitoringCycleAsync(CancellationToken ct);
}
```

```csharp
// src/VoltSense.Application/Interfaces/ITelemetryBroadcaster.cs
using VoltSense.Application.DTOs;

namespace VoltSense.Application.Interfaces;

/// Abstraction so Application layer never depends on SignalR (Api layer) directly.
public interface ITelemetryBroadcaster
{
    Task BroadcastTelemetryUpdatedAsync(TelemetryDto telemetry, CancellationToken ct);
    Task BroadcastConnectionChangedAsync(bool isConnected, CancellationToken ct);
    Task BroadcastStatusChangedAsync(string status, CancellationToken ct);
}
```

```csharp
// src/VoltSense.Application/Services/UpsMonitoringService.cs
using Microsoft.Extensions.Logging;
using VoltSense.Application.DTOs;
using VoltSense.Application.Interfaces;
using VoltSense.Domain.Entities;
using VoltSense.Domain.Enums;
using VoltSense.Domain.Interfaces;

namespace VoltSense.Application.Services;

public sealed class UpsMonitoringService : IUpsMonitoringService
{
    private readonly IUpsProvider _provider;
    private readonly IUpsRepository _repository;
    private readonly ITelemetryBroadcaster _broadcaster;
    private readonly ILogger<UpsMonitoringService> _logger;
    private bool _lastKnownConnected;
    private UpsStatus _lastKnownStatus = UpsStatus.Unknown;

    public UpsMonitoringService(
        IUpsProvider provider, IUpsRepository repository,
        ITelemetryBroadcaster broadcaster, ILogger<UpsMonitoringService> logger)
    {
        _provider = provider;
        _repository = repository;
        _broadcaster = broadcaster;
        _logger = logger;
    }

    public async Task RunMonitoringCycleAsync(CancellationToken ct)
    {
        var connectionStatus = await _provider.GetConnectionStatusAsync(ct);

        if (connectionStatus.IsConnected != _lastKnownConnected)
        {
            _lastKnownConnected = connectionStatus.IsConnected;
            await _broadcaster.BroadcastConnectionChangedAsync(connectionStatus.IsConnected, ct);
        }

        if (!connectionStatus.IsConnected)
        {
            return; // PRD §33/§60 — keep scanning, do not throw, do not crash
        }

        var deviceInfo = await _provider.GetDeviceInfoAsync(ct);
        if (deviceInfo is null) return;

        var device = new UpsDevice
        {
            Manufacturer = deviceInfo.Manufacturer,
            Model = deviceInfo.Model,
            SerialNumber = deviceInfo.SerialNumber,
            VendorId = deviceInfo.VendorId,
            ProductId = deviceInfo.ProductId,
            ConnectionType = deviceInfo.ConnectionType,
            FirmwareVersion = deviceInfo.FirmwareVersion
        };
        await _repository.AddOrUpdateDeviceAsync(device, ct);

        var activeDevice = await _repository.GetActiveDeviceAsync(ct);
        if (activeDevice is null) return;

        var telemetry = await _provider.GetTelemetryAsync(ct);
        if (telemetry is null) return;

        var snapshot = new TelemetrySnapshot
        {
            UpsDeviceId = activeDevice.Id,
            Timestamp = telemetry.Timestamp,
            BatteryCharge = telemetry.BatteryChargePercent,
            BatteryVoltage = telemetry.BatteryVoltage,
            LoadPercentage = telemetry.LoadPercent,
            InputVoltage = telemetry.InputVoltage,
            OutputVoltage = telemetry.OutputVoltage,
            RuntimeSeconds = telemetry.RuntimeSeconds,
            Temperature = telemetry.TemperatureCelsius,
            Frequency = telemetry.FrequencyHz,
            Power = telemetry.PowerWatts,
            Status = telemetry.Status
        };
        await _repository.AddTelemetrySnapshotAsync(snapshot, ct);

        if (telemetry.Status != _lastKnownStatus)
        {
            _lastKnownStatus = telemetry.Status;
            await _broadcaster.BroadcastStatusChangedAsync(telemetry.Status.ToString(), ct);
        }

        await _broadcaster.BroadcastTelemetryUpdatedAsync(MapToDto(snapshot), ct);
    }

    private static TelemetryDto MapToDto(TelemetrySnapshot s) => new(
        s.Timestamp, s.BatteryCharge, s.BatteryVoltage, s.LoadPercentage,
        s.InputVoltage, s.OutputVoltage, s.RuntimeSeconds, s.Temperature,
        s.Frequency, s.Power, s.Status.ToString());
}
```

### 6.3 Retention Service

```csharp
// src/VoltSense.Application/Services/TelemetryRetentionService.cs
using Microsoft.Extensions.Logging;
using VoltSense.Domain.Interfaces;

namespace VoltSense.Application.Services;

public sealed class TelemetryRetentionService
{
    private readonly IUpsRepository _repository;
    private readonly ILogger<TelemetryRetentionService> _logger;

    public TelemetryRetentionService(IUpsRepository repository, ILogger<TelemetryRetentionService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task ApplyRetentionAsync(int retentionDays, CancellationToken ct)
    {
        var cutoff = DateTimeOffset.UtcNow.AddDays(-retentionDays);
        var deleted = await _repository.DeleteOldTelemetryAsync(cutoff, ct);
        if (deleted > 0)
            _logger.LogInformation("Retention: deleted {Count} telemetry rows older than {Cutoff}", deleted, cutoff);
    }
}
```

---

## 7. Phase 6 — Api Layer: SignalR Hub + Broadcaster

```csharp
// src/VoltSense.Api/Hubs/UpsHub.cs
using Microsoft.AspNetCore.SignalR;

namespace VoltSense.Api.Hubs;

/// Clients only ever receive server → client events here. No client → server control methods (read-only policy).
public class UpsHub : Hub
{
}
```

```csharp
// src/VoltSense.Api/Hubs/SignalRTelemetryBroadcaster.cs
using Microsoft.AspNetCore.SignalR;
using VoltSense.Application.DTOs;
using VoltSense.Application.Interfaces;

namespace VoltSense.Api.Hubs;

public sealed class SignalRTelemetryBroadcaster : ITelemetryBroadcaster
{
    private readonly IHubContext<UpsHub> _hub;
    public SignalRTelemetryBroadcaster(IHubContext<UpsHub> hub) => _hub = hub;

    public Task BroadcastTelemetryUpdatedAsync(TelemetryDto telemetry, CancellationToken ct) =>
        _hub.Clients.All.SendAsync("ups:telemetry-updated", telemetry, ct);

    public Task BroadcastConnectionChangedAsync(bool isConnected, CancellationToken ct) =>
        _hub.Clients.All.SendAsync(isConnected ? "ups:connected" : "ups:disconnected", ct);

    public Task BroadcastStatusChangedAsync(string status, CancellationToken ct) =>
        _hub.Clients.All.SendAsync("ups:status-changed", status, ct);
}
```

---

## 8. Phase 7 — Background Worker (BackgroundService, MUST use CancellationToken correctly)

```csharp
// src/VoltSense.Api/BackgroundServices/UpsMonitoringWorker.cs
using VoltSense.Application.Interfaces;
using VoltSense.Application.Services;

namespace VoltSense.Api.BackgroundServices;

public sealed class UpsMonitoringWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<UpsMonitoringWorker> _logger;

    public UpsMonitoringWorker(
        IServiceScopeFactory scopeFactory, IConfiguration configuration, ILogger<UpsMonitoringWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var intervalSeconds = _configuration.GetValue("Monitoring:IntervalSeconds", 5);
        var retentionDays = _configuration.GetValue("Monitoring:RetentionDays", 30);
        var interval = TimeSpan.FromSeconds(intervalSeconds);
        var lastRetentionRun = DateTimeOffset.MinValue;

        _logger.LogInformation("UPS monitoring worker started (interval: {Interval}s)", intervalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var monitoringService = scope.ServiceProvider.GetRequiredService<IUpsMonitoringService>();
                await monitoringService.RunMonitoringCycleAsync(stoppingToken);

                if (DateTimeOffset.UtcNow - lastRetentionRun > TimeSpan.FromHours(24))
                {
                    var retention = scope.ServiceProvider.GetRequiredService<TelemetryRetentionService>();
                    await retention.ApplyRetentionAsync(retentionDays, stoppingToken);
                    lastRetentionRun = DateTimeOffset.UtcNow;
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break; // graceful shutdown, PRD §55
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error in UPS monitoring cycle — continuing");
            }

            try { await Task.Delay(interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }

        _logger.LogInformation("UPS monitoring worker stopped");
    }
}
```

---

## 9. Phase 8 — REST API Controllers (DTOs only, no EF entity leakage)

```csharp
// src/VoltSense.Api/Controllers/UpsController.cs
using Microsoft.AspNetCore.Mvc;
using VoltSense.Application.DTOs;
using VoltSense.Domain.Interfaces;

namespace VoltSense.Api.Controllers;

[ApiController]
[Route("api/ups")]
public class UpsController : ControllerBase
{
    private readonly IUpsRepository _repository;
    public UpsController(IUpsRepository repository) => _repository = repository;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UpsDeviceDto>>> GetAll(CancellationToken ct)
    {
        var devices = await _repository.GetAllAsync(ct);
        return Ok(devices.Select(ToDto));
    }

    [HttpGet("current")]
    public async Task<ActionResult<UpsDeviceDto>> GetCurrent(CancellationToken ct)
    {
        var device = await _repository.GetActiveDeviceAsync(ct);
        return device is null ? NotFound(new { message = "No UPS detected" }) : Ok(ToDto(device));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UpsDeviceDto>> GetById(Guid id, CancellationToken ct)
    {
        var device = await _repository.GetByIdAsync(id, ct);
        return device is null ? NotFound() : Ok(ToDto(device));
    }

    private static UpsDeviceDto ToDto(Domain.Entities.UpsDevice d) => new(
        d.Id, d.Manufacturer, d.Model, d.ConnectionType.ToString(),
        d.FirmwareVersion, d.LastSeenAt, d.IsActive);
}
```

```csharp
// src/VoltSense.Api/Controllers/HistoryController.cs
using Microsoft.AspNetCore.Mvc;
using VoltSense.Application.DTOs;
using VoltSense.Domain.Interfaces;

namespace VoltSense.Api.Controllers;

[ApiController]
[Route("api/ups/{id:guid}/history")]
public class HistoryController : ControllerBase
{
    private readonly IUpsRepository _repository;
    public HistoryController(IUpsRepository repository) => _repository = repository;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TelemetryDto>>> GetHistory(
        Guid id,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        CancellationToken ct)
    {
        var fromDate = from ?? DateTimeOffset.UtcNow.AddDays(-1);
        var toDate = to ?? DateTimeOffset.UtcNow;
        var snapshots = await _repository.GetHistoryAsync(id, fromDate, toDate, ct);

        return Ok(snapshots.Select(s => new TelemetryDto(
            s.Timestamp, s.BatteryCharge, s.BatteryVoltage, s.LoadPercentage,
            s.InputVoltage, s.OutputVoltage, s.RuntimeSeconds, s.Temperature,
            s.Frequency, s.Power, s.Status.ToString())));
    }
}
```

```csharp
// src/VoltSense.Api/Controllers/TelemetryController.cs
using Microsoft.AspNetCore.Mvc;
using VoltSense.Application.DTOs;
using VoltSense.Domain.Interfaces;

namespace VoltSense.Api.Controllers;

[ApiController]
[Route("api/ups/{id:guid}/telemetry")]
public class TelemetryController : ControllerBase
{
    private readonly IUpsRepository _repository;
    public TelemetryController(IUpsRepository repository) => _repository = repository;

    [HttpGet("latest")]
    public async Task<ActionResult<TelemetryDto>> GetLatest(Guid id, CancellationToken ct)
    {
        var snapshots = await _repository.GetHistoryAsync(
            id, DateTimeOffset.UtcNow.AddMinutes(-10), DateTimeOffset.UtcNow, ct);
        var latest = snapshots.LastOrDefault();
        return latest is null
            ? NotFound(new { message = "No recent telemetry" })
            : Ok(new TelemetryDto(latest.Timestamp, latest.BatteryCharge, latest.BatteryVoltage,
                latest.LoadPercentage, latest.InputVoltage, latest.OutputVoltage, latest.RuntimeSeconds,
                latest.Temperature, latest.Frequency, latest.Power, latest.Status.ToString()));
    }
}
```

```csharp
// src/VoltSense.Api/Controllers/SystemController.cs
using Microsoft.AspNetCore.Mvc;
using System.Reflection;

namespace VoltSense.Api.Controllers;

[ApiController]
[Route("api/system")]
public class SystemController : ControllerBase
{
    [HttpGet("status")]
    public IActionResult GetStatus() => Ok(new { status = "running", timestamp = DateTimeOffset.UtcNow });

    [HttpGet("version")]
    public IActionResult GetVersion() => Ok(new
    {
        version = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0"
    });
}
```

> **MUST:** কোনো control endpoint (`POST /api/ups/shutdown`, `/restart`, `/test`, `PUT /configuration`) কখনো
> তৈরি করা যাবে না — PRD §23 hard rule।

---

## 10. Phase 9 — Middleware, DI Wiring, Program.cs

```csharp
// src/VoltSense.Api/Middleware/ExceptionHandlingMiddleware.cs
using System.Net;
using System.Text.Json;

namespace VoltSense.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try { await _next(context); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception processing {Path}", context.Request.Path);
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                message = "An unexpected error occurred."
            }));
        }
    }
}
```

```csharp
// src/VoltSense.Api/Program.cs
using Microsoft.EntityFrameworkCore;
using Serilog;
using VoltSense.Api.BackgroundServices;
using VoltSense.Api.Hubs;
using VoltSense.Api.Middleware;
using VoltSense.Application.Interfaces;
using VoltSense.Application.Services;
using VoltSense.Domain.Interfaces;
using VoltSense.Infrastructure.Persistence;
using VoltSense.Infrastructure.Persistence.Repositories;
using VoltSense.Infrastructure.UPS;

var builder = WebApplication.CreateBuilder(args);

// Structured logging (MUST — industry standard, PRD §34)
builder.Host.UseSerilog((ctx, cfg) => cfg
    .ReadFrom.Configuration(ctx.Configuration)
    .WriteTo.Console());

// Database
builder.Services.AddDbContext<VoltSenseDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Domain / Application services (DI — MUST, PRD §62 rule 9)
builder.Services.AddScoped<IUpsRepository, UpsRepository>();
builder.Services.AddScoped<IUpsMonitoringService, UpsMonitoringService>();
builder.Services.AddScoped<TelemetryRetentionService>();
builder.Services.AddScoped<ITelemetryBroadcaster, SignalRTelemetryBroadcaster>();

// Hardware provider — Windows HID (swap implementation for Linux/macOS later, same interface)
builder.Services.AddSingleton<IUpsProvider, WindowsHidUpsProvider>();

// Background worker
builder.Services.AddHostedService<UpsMonitoringWorker>();

// Web layer
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Bind to localhost only by default (MUST — PRD §35 security)
builder.Services.AddCors(options =>
{
    options.AddPolicy("LocalFrontend", policy =>
        policy.WithOrigins("http://localhost:5173") // Vite dev server
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

var app = builder.Build();

// Apply migrations automatically on startup (local-first, no manual DBA step for the user)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<VoltSenseDbContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseCors("LocalFrontend");
app.UseAuthorization();
app.MapControllers();
app.MapHub<UpsHub>("/api/hubs/ups");

app.Run();
```

---

## 11. Phase 10 — Logging (Serilog, structured, MUST)

- Startup, UPS detected/disconnected, provider errors, DB errors, monitoring errors, unhandled
  exceptions — সব log করতে হবে (PRD §34)।
- প্রতিটি 5-সেকেন্ড টেলিমেট্রি রিডিং আলাদাভাবে log **করা যাবে না** (log spam এড়াতে হবে)।
- কোনো credential/connection-string password log-এ কখনো print করা যাবে না।

---

## 12. Phase 11 — Testing Strategy (MUST, xUnit + industry-grade mocking)

```bash
dotnet new xunit -n VoltSense.Application.Tests -o tests/VoltSense.Application.Tests
dotnet add tests/VoltSense.Application.Tests package Moq
dotnet add tests/VoltSense.Application.Tests package FluentAssertions
dotnet add tests/VoltSense.Application.Tests reference src/VoltSense.Application
```

Unit test করতে হবে:
- `UpsMonitoringService.RunMonitoringCycleAsync` — connected/disconnected branches, mocked `IUpsProvider`।
- Telemetry validation (null-safety, no fabricated data)।
- Retention logic (`DeleteOldTelemetryAsync` boundary dates)।
- Status mapping (`UpsStatus` transitions)।

Integration test করতে হবে (`WebApplicationFactory`):
- `/api/ups/current` → 404 when none active, 200 when active।
- `/api/ups/{id}/history` → date range filtering।
- SignalR hub connectivity smoke test।

Hardware test (manual, PRD §57): real UPS প্লাগ করে detection → telemetry → unplug → replug flow verify করুন।

---

## 13. Phase 12 — Run Locally (Development)

```bash
# 1. Start PostgreSQL locally (native install or existing local service)

# 2. Apply migrations + run API
cd src/VoltSense.Api
dotnet run
# → http://localhost:5279 , Swagger at /swagger
# → SignalR hub at http://localhost:5279/api/hubs/ups
```

---

## 14. Acceptance Checklist (এই সব MUST পূরণ করতে হবে — PRD §58)

- [ ] `dotnet build` কোনো warning ছাড়া successful।
- [ ] Clean Architecture dependency direction ঠিক আছে (Domain কোনো কিছুর উপর নির্ভর করে না)।
- [ ] `IUpsProvider`-এ কোনো write/control operation নেই।
- [ ] No control endpoints (`shutdown`/`restart`/`test`/`configuration`) exist।
- [ ] Unavailable telemetry সবসময় `null`, কখনো fabricate করা হয় না।
- [ ] UPS disconnect হলে অ্যাপ crash করে না, scanning চলতে থাকে, reconnect হলে auto-resume করে।
- [ ] সব input validated, parameterized EF queries (SQL injection safe)।
- [ ] API শুধু `localhost` bind করে, কোনো public exposure default-এ নেই।
- [ ] কোনো paid/cloud dependency নেই — সব local, free, open-source।
- [ ] Structured logging কাজ করছে, sensitive data log হচ্ছে না।

---

**এই ডকুমেন্ট সম্পূর্ণ backend implementation-এর blueprint। প্রতিটি ফাইল অবশ্যই industry-expert মানে লিখতে হবে —
কোনো placeholder, dummy বা low-quality কোড production-এ যাবে না। শুধুমাত্র §5 (HID report parsing)
device-specific অংশটুকু বাস্তব হার্ডওয়্যার টেস্টিং সাপেক্ষে সম্পূর্ণ করতে হবে।**
