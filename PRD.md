# VoltSense

## Free, Read-Only UPS Monitoring Application

**Document Type:** Product Requirements Document (PRD)
**Project Name:** VoltSense
**Version:** 1.0
**Status:** Ready for Implementation
**Target Platform:** Windows Desktop
**Primary Purpose:** Local UPS detection, monitoring, telemetry visualization, and historical performance tracking

---

# 1. Product Overview

VoltSense is a lightweight, minimal, locally hosted UPS monitoring application designed to automatically detect a connected UPS and display its available performance and battery information in a clean dashboard.

The application will communicate with the UPS in a **strictly read-only manner**.

VoltSense will never intentionally issue commands that modify, configure, test, shut down, restart, or otherwise control the UPS.

The application will:

* Automatically detect supported UPS devices.
* Read available UPS telemetry.
* Display battery charge.
* Display battery-related health information when available.
* Display UPS load.
* Display input/output voltage when available.
* Display estimated runtime when available.
* Display UPS connection/status.
* Continuously monitor the UPS in the background.
* Push live changes to the frontend.
* Store historical telemetry locally.
* Display historical performance information.
* Handle UPS disconnection/reconnection.
* Operate without any cloud service or paid dependency.

---

# 2. Core Product Philosophy

VoltSense follows five principles:

### 2.1 Read Only

VoltSense is a monitoring application, not a UPS management application.

### 2.2 Local First

All monitoring and storage happen on the user's machine.

### 2.3 Free Forever

Every required technology and dependency must be:

* Free
* Open-source where applicable
* Self-hostable/local
* Not dependent on a paid subscription
* Not dependent on a free trial
* Not dependent on a paid API

### 2.4 Minimal

The UI should expose useful information without becoming an enterprise monitoring platform.

### 2.5 Hardware-Agnostic Architecture

The application should not be tightly coupled to one UPS manufacturer or model.

---

# 3. Technology Stack

## 3.1 Frontend

```text
React
TypeScript
Vite
Tailwind CSS
shadcn/ui
```

### Responsibilities

* Dashboard
* UPS status visualization
* Battery visualization
* Telemetry cards
* Historical charts
* Connection status
* Error states
* Device information
* Settings

---

# 4. Backend

```text
ASP.NET Core
C#
ASP.NET Core Web API
```

### Responsibilities

* UPS detection
* Hardware communication
* Telemetry collection
* Data validation
* Background monitoring
* REST API
* SignalR communication
* Device lifecycle management
* Persistence
* Application configuration

---

# 5. Hardware Layer

## Primary

```text
USB HID
Windows APIs
```

## Future

```text
Serial / COM
```

The hardware layer must be abstracted from the rest of the application.

The application must not directly expose hardware-specific implementation details to controllers.

---

# 6. Storage

```text
PostgreSQL
Entity Framework Core
```

PostgreSQL will store:

* UPS devices
* Device metadata
* Telemetry snapshots
* Connection events
* Monitoring history
* Application-level configuration where required

The database will run locally.

No external database hosting is required.

---

# 7. Realtime Communication

```text
ASP.NET Core SignalR
```

SignalR will be used to push live UPS updates from the backend to React.

Example:

```text
UPS
 ↓
Background Worker
 ↓
UPS Provider
 ↓
Telemetry
 ↓
SignalR
 ↓
React
```

The frontend should not continuously poll the backend for every small telemetry change.

---

# 8. Architecture

VoltSense will follow Clean Architecture principles.

```text
VoltSense
│
├── Domain
│
├── Application
│
├── Infrastructure
│
└── API
```

Recommended structure:

```text
src/
│
├── VoltSense.Domain/
│
│   ├── Entities/
│   ├── Enums/
│   ├── ValueObjects/
│   └── Interfaces/
│
├── VoltSense.Application/
│
│   ├── DTOs/
│   ├── Interfaces/
│   ├── Services/
│   ├── UseCases/
│   └── Validators/
│
├── VoltSense.Infrastructure/
│
│   ├── Persistence/
│   ├── UPS/
│   ├── Hardware/
│   ├── Windows/
│   └── Services/
│
└── VoltSense.Api/
    │
    ├── Controllers/
    ├── Hubs/
    ├── Middleware/
    ├── BackgroundServices/
    └── Program.cs
```

Frontend:

```text
frontend/
│
├── src/
│   ├── components/
│   ├── features/
│   │   ├── dashboard/
│   │   ├── ups/
│   │   ├── history/
│   │   └── settings/
│   │
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── types/
│   ├── stores/
│   └── App.tsx
│
└── main.tsx
```

---

# 9. UPS Provider Abstraction

The most important architectural component is the UPS provider abstraction.

Define an interface similar to:

```text
IUpsProvider
```

The rest of the application communicates only with this abstraction.

Conceptually:

```text
IUpsProvider
│
├── DetectDevices()
├── GetDeviceInfo()
├── GetTelemetry()
└── GetConnectionStatus()
```

Future implementations can include:

```text
WindowsHidUpsProvider
SerialUpsProvider
NetworkUpsProvider
```

Only the provider layer knows how to communicate with the actual hardware.

---

# 10. Read-Only Hardware Policy

VoltSense must enforce a strict read-only policy.

Allowed operations:

```text
Device detection
Device identification
Battery reading
Voltage reading
Load reading
Runtime reading
Status reading
Temperature reading
Manufacturer information
Model information
Firmware information
Other read-only telemetry
```

Disallowed operations:

```text
UPS shutdown
UPS restart
UPS reboot
Battery test
Self-test initiation
Configuration modification
Alarm configuration
Charging configuration
Output control
Input/output switching
Firmware modification
```

The application must not implement APIs for these operations.

---

# 11. UPS Auto Detection

When VoltSense starts:

```text
Application Start
        ↓
Initialize hardware provider
        ↓
Scan available UPS devices
        ↓
Identify supported devices
        ↓
Select detected device
        ↓
Start monitoring
```

If no UPS is detected:

```text
No UPS detected
```

must be displayed instead of showing fake/default values.

---

# 12. Multiple UPS Support

### MVP

Support one active UPS.

### Architecture

The provider abstraction should not prevent multiple UPS support later.

Future:

```text
UPS #1
UPS #2
UPS #3
```

could be monitored independently.

---

# 13. Telemetry Model

VoltSense should support the following telemetry fields.

## Required when available

```text
Battery Charge %
UPS Status
Load %
```

## Optional

```text
Battery Voltage
Input Voltage
Output Voltage
Estimated Runtime
Temperature
Frequency
Power
Apparent Power
Manufacturer
Model
Serial Number
Firmware Version
```

Not every UPS exposes every metric.

The UI must gracefully handle unavailable values.

Example:

```text
Output Voltage
221 V
```

or:

```text
Output Voltage
Unavailable
```

Never fabricate missing data.

---

# 14. Battery Information

The application must distinguish between:

### Battery Charge

Current available charge.

Example:

```text
87%
```

### Battery Health

Battery health should only be displayed as a directly reported value if the UPS exposes such information.

If the UPS does not expose actual battery health, VoltSense must not falsely represent charge percentage as health.

Future battery-health estimation may use historical telemetry.

---

# 15. UPS Status

Supported logical states:

```text
Online
On Battery
Low Battery
Charging
Discharging
Disconnected
Unknown
```

The exact mapping depends on available UPS telemetry.

---

# 16. Dashboard

The Dashboard is the primary screen.

Recommended layout:

```text
┌─────────────────────────────────────────────┐
│ VoltSense                         ● Online │
├─────────────────────────────────────────────┤
│                                             │
│ Battery                                     │
│                                             │
│              87%                            │
│          ████████████░░                     │
│                                             │
├───────────────────┬─────────────────────────┤
│ UPS Status        │ Load                    │
│ Online            │ 23%                     │
├───────────────────┼─────────────────────────┤
│ Input Voltage     │ Output Voltage           │
│ 220 V             │ 221 V                   │
├───────────────────┼─────────────────────────┤
│ Runtime           │ Battery Health           │
│ 38 min            │ Good / N/A              │
└───────────────────┴─────────────────────────┘
```

---

# 17. Dashboard Components

## 17.1 Device Header

Display:

```text
Manufacturer
Model
Connection type
Connection status
```

Example:

```text
CyberPower
CP1500...
USB HID
Connected
```

---

## 17.2 Battery Card

Display:

```text
Battery Charge
87%
```

Visual progress indicator.

Battery state should influence the UI.

---

## 17.3 Status Card

Examples:

```text
Online
On Battery
Charging
Low Battery
Disconnected
```

---

## 17.4 Load Card

Example:

```text
Load
23%
```

If supported, optionally:

```text
230 W
```

---

## 17.5 Voltage Cards

```text
Input
220 V

Output
221 V
```

Only show these if the UPS provides the information.

---

## 17.6 Runtime Card

Example:

```text
Estimated Runtime
38 min
```

If unavailable:

```text
Unavailable
```

---

# 18. Device Information

Separate device section:

```text
Manufacturer
Model
Serial Number
Firmware Version
Connection
Vendor ID
Product ID
```

Sensitive identifiers such as serial numbers should not be unnecessarily exposed outside the local application.

---

# 19. Historical Monitoring

VoltSense should store telemetry snapshots.

Example:

```text
10:00 → Battery 100%
10:05 → Battery 99%
10:10 → Battery 98%
10:15 → Battery 97%
```

The application can visualize:

```text
Battery History
Load History
Voltage History
Runtime History
```

---

# 20. Telemetry Sampling

The monitoring worker should use a configurable interval.

Default:

```text
5 seconds
```

Example:

```text
Every 5 seconds
    ↓
Read UPS telemetry
    ↓
Validate
    ↓
Update current state
    ↓
Persist according to storage strategy
    ↓
Broadcast SignalR event
```

The exact persistence frequency may be optimized later to avoid unnecessary database growth.

---

# 21. Background Worker

Use:

```text
BackgroundService
```

inside ASP.NET Core.

Responsibilities:

* Detect UPS
* Monitor connection
* Read telemetry
* Detect changes
* Persist telemetry
* Broadcast updates
* Handle reconnection

Conceptually:

```text
Background Worker
       │
       ▼
IUpsProvider
       │
       ▼
Read Telemetry
       │
       ├── Database
       │
       └── SignalR
```

---

# 22. SignalR Events

Suggested events:

```text
ups:connected
ups:disconnected
ups:telemetry-updated
ups:status-changed
ups:battery-changed
```

Example payload:

```text
{
  batteryCharge: 87,
  load: 23,
  inputVoltage: 220,
  outputVoltage: 221,
  runtimeSeconds: 2280,
  status: "Online"
}
```

---

# 23. REST API

Suggested endpoints:

## UPS

```text
GET /api/ups
GET /api/ups/current
GET /api/ups/{id}
```

## Telemetry

```text
GET /api/ups/{id}/telemetry
GET /api/ups/{id}/telemetry/latest
```

## History

```text
GET /api/ups/{id}/history
GET /api/ups/{id}/history/battery
GET /api/ups/{id}/history/load
```

## System

```text
GET /api/system/status
GET /api/system/version
```

No control endpoints should exist.

For example, these must NOT exist:

```text
POST /api/ups/shutdown
POST /api/ups/restart
POST /api/ups/test
PUT /api/ups/configuration
```

---

# 24. Database Design

Recommended entities:

```text
UpsDevice
TelemetrySnapshot
ConnectionEvent
```

## UpsDevice

```text
Id
Manufacturer
Model
SerialNumber
VendorId
ProductId
ConnectionType
FirmwareVersion
FirstDetectedAt
LastSeenAt
IsActive
CreatedAt
UpdatedAt
```

## TelemetrySnapshot

```text
Id
UpsDeviceId
Timestamp
BatteryCharge
BatteryVoltage
LoadPercentage
InputVoltage
OutputVoltage
RuntimeSeconds
Temperature
Frequency
Power
Status
```

All optional hardware values should be nullable.

---

# 25. PostgreSQL Strategy

Use:

```text
Entity Framework Core
Npgsql
PostgreSQL
```

Database connection should come from configuration/environment variables.

Example:

```text
ConnectionStrings__DefaultConnection
```

The application must not hard-code database credentials.

---

# 26. Data Retention

Because telemetry can grow continuously, VoltSense should implement configurable retention.

Default example:

```text
Detailed telemetry:
30 days
```

Future options:

```text
7 days
30 days
90 days
1 year
Unlimited
```

Old telemetry can be automatically deleted.

---

# 27. Frontend State Management

For MVP, avoid unnecessary state-management complexity.

React state + custom hooks may be sufficient.

If centralized state becomes useful:

```text
Zustand
```

can be introduced.

It is not mandatory unless required by implementation.

---

# 28. Frontend Data Flow

Initial load:

```text
React
 ↓
GET /api/ups/current
 ↓
Display current UPS
```

Realtime:

```text
SignalR
 ↓
Telemetry update
 ↓
React state update
 ↓
UI update
```

This provides immediate live updates.

---

# 29. UI/UX Requirements

The interface should be:

* Minimal
* Clean
* Fast
* Responsive
* Desktop-friendly
* Information-focused

Avoid:

* Excessive animations
* Huge navigation systems
* Unnecessary pages
* Decorative dashboards
* Fake metrics
* Overly complicated configuration

---

# 30. Pages

## MVP

### 1. Dashboard

Main monitoring interface.

### 2. History

Historical charts.

### 3. Settings

Minimal application settings.

### 4. About

Application/version information.

---

# 31. Settings

Possible settings:

```text
Monitoring interval
Telemetry retention
Theme
Startup behavior
Database configuration
```

Hardware control settings must not exist.

---

# 32. Connection States

Frontend must clearly distinguish:

### Connected

```text
UPS Connected
```

### Searching

```text
Searching for UPS...
```

### Disconnected

```text
UPS Disconnected
```

### Unsupported

```text
UPS Detected
Telemetry Not Supported
```

### Error

```text
Unable to read UPS telemetry
```

---

# 33. Error Handling

The backend must handle:

* UPS unplugged
* USB connection lost
* Device unavailable
* Device busy
* Invalid telemetry
* Unsupported telemetry
* Permission issues
* Database unavailable
* SignalR connection failure
* Provider failure

The application must continue running when possible.

Example:

```text
UPS disconnects
       ↓
Worker detects failure
       ↓
Mark device disconnected
       ↓
Notify frontend
       ↓
Continue scanning
       ↓
UPS reconnects
       ↓
Automatically resume monitoring
```

---

# 34. Logging

Use structured application logging.

Log:

```text
Application startup
UPS detected
UPS disconnected
Provider errors
Database errors
Monitoring errors
Unexpected exceptions
```

Do not excessively log every telemetry reading.

Avoid logging sensitive information such as credentials.

---

# 35. Security

VoltSense is local-first, but security still matters.

Requirements:

* Validate API input.
* Validate telemetry.
* Use parameterized database queries through EF Core.
* Never expose database credentials.
* Avoid unnecessary network exposure.
* Bind the API to localhost by default.
* Do not expose VoltSense publicly by default.
* Do not implement remote UPS control.
* Do not collect unnecessary user information.

Recommended default:

```text
http://localhost:<port>
```

---

# 36. Privacy

VoltSense should not require:

```text
Account
Email
Cloud account
Analytics account
External authentication
```

No telemetry should be sent to an external server.

All monitoring data remains local.

---

# 37. Zero Paid Dependency Policy

This is a hard product requirement.

VoltSense must not require:

```text
Paid API
Paid SaaS
Subscription
Free trial
Commercial SDK
Paid monitoring service
Cloud database
Cloud hosting
Paid authentication
Paid analytics
```

The application must remain fully functional locally.

---

# 38. Open/Free Technology Policy

Preferred technologies must be:

```text
React
TypeScript
Vite
Tailwind CSS
shadcn/ui
ASP.NET Core
C#
Entity Framework Core
PostgreSQL
SignalR
```

All required production functionality must work without purchasing licenses or subscriptions.

---

# 39. Platform Target

## MVP

```text
Windows
```

Reason:

The first hardware provider will target Windows USB/HID APIs.

## Future

Possible support:

```text
Linux
macOS
```

Future platform providers should implement the same abstraction:

```text
IUpsProvider
```

Example:

```text
WindowsHidUpsProvider
LinuxUpsProvider
MacUpsProvider
```

---

# 40. Future Serial Support

Serial support should not be implemented in MVP unless required by the target UPS.

Architecture should reserve:

```text
ISerialUpsProvider
```

or equivalent infrastructure implementation.

Potential connection:

```text
COM3
COM4
...
```

---

# 41. UPS Compatibility Strategy

VoltSense should not assume every UPS exposes the same data.

Telemetry capability should be dynamic.

Example:

```text
Battery Charge       ✓
Load                 ✓
Input Voltage        ✓
Output Voltage       ✓
Runtime              ✓
Temperature          ✗
Frequency            ✗
```

The frontend should only show unavailable fields as unavailable, not fabricate values.

---

# 42. MVP Scope

MVP must contain:

```text
✓ Automatic UPS detection
✓ USB/HID support
✓ Read-only telemetry
✓ Battery charge
✓ UPS status
✓ Load
✓ Input voltage when available
✓ Output voltage when available
✓ Runtime when available
✓ Device information
✓ Background monitoring
✓ SignalR realtime updates
✓ PostgreSQL storage
✓ Historical telemetry
✓ React dashboard
✓ Connection/disconnection handling
✓ Clean Architecture
✓ Zero paid dependency
```

---

# 43. Out of Scope for MVP

Do not implement:

```text
✗ UPS shutdown
✗ UPS restart
✗ UPS battery testing
✗ UPS configuration
✗ Firmware updates
✗ Remote monitoring
✗ Cloud dashboard
✗ User accounts
✗ Multi-user authentication
✗ Mobile application
✗ Notifications through paid services
✗ SNMP
✗ Multiple UPS management UI
```

These can be considered future features.

---

# 44. Development Phases

## Phase 1 — Project Initialization

Create:

```text
VoltSense/
├── backend/
└── frontend/
```

Initialize:

```text
ASP.NET Core Web API
React + TypeScript + Vite
PostgreSQL
EF Core
SignalR
```

---

# 45. Phase 2 — Clean Architecture

Create:

```text
Domain
Application
Infrastructure
API
```

Establish dependency direction:

```text
API
 ↓
Application
 ↓
Domain

Infrastructure
 ↓
Application
Domain
```

Domain must not depend on Infrastructure.

---

# 46. Phase 3 — Database

Configure:

```text
PostgreSQL
EF Core
Npgsql
```

Create migrations.

Create:

```text
UpsDevice
TelemetrySnapshot
ConnectionEvent
```

Run initial migration.

---

# 47. Phase 4 — UPS Abstraction

Create:

```text
IUpsProvider
IUpsDeviceDetector
IUpsTelemetryReader
```

Define normalized domain models.

Example:

```text
UpsTelemetry
UpsDeviceInfo
UpsConnectionStatus
```

---

# 48. Phase 5 — Windows USB/HID Provider

Implement:

```text
WindowsHidUpsProvider
```

Responsibilities:

```text
Detect USB UPS
Identify device
Read supported HID information
Normalize telemetry
Return domain models
```

Important:

The provider must perform only read operations.

---

# 49. Phase 6 — Background Monitoring

Implement:

```text
UpsMonitoringWorker : BackgroundService
```

Workflow:

```text
Start
 ↓
Detect UPS
 ↓
Read telemetry
 ↓
Validate
 ↓
Persist
 ↓
Broadcast SignalR
 ↓
Wait
 ↓
Repeat
```

Handle cancellation correctly.

---

# 50. Phase 7 — REST API

Implement:

```text
GET /api/ups
GET /api/ups/current
GET /api/ups/{id}
GET /api/ups/{id}/telemetry
GET /api/ups/{id}/history
```

Use DTOs rather than exposing EF entities directly.

---

# 51. Phase 8 — SignalR

Create:

```text
UpsHub
```

Push:

```text
TelemetryUpdated
ConnectionChanged
StatusChanged
```

Frontend subscribes to these events.

---

# 52. Phase 9 — React Dashboard

Build:

```text
Dashboard
```

Components:

```text
UpsHeader
BatteryCard
StatusCard
LoadCard
VoltageCard
RuntimeCard
DeviceInfo
ConnectionIndicator
```

---

# 53. Phase 10 — History

Implement charts for:

```text
Battery
Load
Input Voltage
Output Voltage
Runtime
```

Use a free/open-source charting solution.

Do not introduce a paid charting service.

---

# 54. Phase 11 — Error and Reconnection

Test:

```text
UPS connected
UPS disconnected
UPS reconnects
Computer starts without UPS
USB cable removed
USB cable reconnected
Database unavailable
Backend restarted
Frontend restarted
```

---

# 55. Phase 12 — Performance Optimization

Ensure:

* No excessive polling.
* No unnecessary database writes.
* No memory leaks.
* SignalR connections are cleaned up.
* Old telemetry is retained according to policy.
* Background worker shuts down gracefully.

---

# 56. Phase 13 — Packaging

For initial release, provide a simple local installation/run process.

Development:

```text
Backend → ASP.NET Core
Frontend → Vite
Database → PostgreSQL
```

Production packaging can later bundle the frontend and backend into a desktop-friendly distribution.

---

# 57. Testing Strategy

## Unit Tests

Test:

```text
Telemetry normalization
Battery calculations
Status mapping
Validation
Retention logic
Provider abstraction
```

## Integration Tests

Test:

```text
API
Database
SignalR
Background worker
```

## Hardware Tests

Test with real UPS devices:

```text
Detection
Telemetry reading
Disconnect
Reconnect
Battery state
Load
Voltage
Runtime
```

---

# 58. Acceptance Criteria

VoltSense MVP is considered successful when:

### Detection

* Application automatically detects a supported UPS.
* No manual configuration is required for normal USB detection.

### Monitoring

* Battery charge is displayed correctly.
* UPS status is displayed correctly.
* Load is displayed when available.
* Voltage is displayed when available.
* Runtime is displayed when available.

### Safety

* Application does not issue UPS control commands.
* No shutdown/restart/test/configuration functionality exists.

### Realtime

* Dashboard updates automatically when telemetry changes.
* No manual refresh is required.

### Reliability

* Disconnecting the UPS does not crash the application.
* Reconnecting the UPS automatically resumes monitoring.

### Storage

* Historical telemetry is stored locally.
* History can be displayed.

### Privacy

* No cloud service is required.
* No user account is required.
* No external telemetry service is required.

### Cost

* No paid dependency is required for the application to operate.

---

# 59. Example User Flow

```text
User starts VoltSense
        ↓
Application initializes
        ↓
PostgreSQL connection established
        ↓
UPS provider initializes
        ↓
USB devices scanned
        ↓
UPS detected
        ↓
Device information loaded
        ↓
Background monitoring starts
        ↓
Telemetry collected
        ↓
Database updated
        ↓
SignalR broadcasts update
        ↓
React dashboard updates
```

---

# 60. UPS Disconnection Flow

```text
UPS connected
      ↓
Monitoring
      ↓
USB disconnected
      ↓
Read failure detected
      ↓
Connection status = Disconnected
      ↓
SignalR event
      ↓
React shows "UPS Disconnected"
      ↓
Background scanner continues
      ↓
USB reconnected
      ↓
UPS detected
      ↓
Monitoring resumes
```

---

# 61. Recommended Project Naming

Backend:

```text
VoltSense.Api
VoltSense.Application
VoltSense.Domain
VoltSense.Infrastructure
```

Frontend:

```text
voltsense-web
```

Database:

```text
voltsense
```

SignalR hub:

```text
/api/hubs/ups
```

---

# 62. Development Rules

The implementation should follow these rules:

```text
1. TypeScript strict mode enabled.
2. C# nullable reference types enabled.
3. No unnecessary any types.
4. No direct EF Core access from controllers.
5. No hardware code inside controllers.
6. No hardware code inside React.
7. No business logic inside React components.
8. Use DTOs for API responses.
9. Use dependency injection.
10. Use async APIs where appropriate.
11. Use cancellation tokens for background work.
12. Validate all external input.
13. Never fabricate unavailable telemetry.
14. Keep hardware provider isolated.
15. Keep the application read-only.
```

---

# 63. Definition of Done

A feature is complete only when:

```text
✓ Implemented
✓ Tested
✓ Error handled
✓ Type safe
✓ Documented where necessary
✓ Works locally
✓ Does not introduce paid dependency
✓ Does not violate read-only UPS policy
```

---

# 64. Final Architecture

```text
                         VoltSense
                            │
            ┌───────────────┴────────────────┐
            │                                │
       React Frontend                  ASP.NET Core
            │                                │
      TypeScript/Vite                        │
      Tailwind/shadcn                        │
            │                                │
            │                         ┌──────┴──────┐
            │                         │             │
            │                    REST API       SignalR
            │                         │             │
            │                         └──────┬──────┘
            │                                │
            │                       Application Layer
            │                                │
            │                           Domain Layer
            │                                │
            │                     Infrastructure Layer
            │                                │
            │                   ┌────────────┴────────────┐
            │                   │                         │
            │             UPS Provider              PostgreSQL
            │                   │                         │
            │             USB HID / Windows            EF Core
            │                   │
            │                  UPS
            │
            └──────────── Live UI ──────────────┘
```

---

# 65. Final Technology Stack

```text
Frontend
──────────────
React
TypeScript
Vite
Tailwind CSS
shadcn/ui


Backend
──────────────
ASP.NET Core
C#
ASP.NET Core Web API


Hardware
──────────────
USB HID
Windows APIs
Serial Support (Future)


Storage
──────────────
PostgreSQL
Entity Framework Core


Realtime
──────────────
SignalR


Architecture
──────────────
Clean Architecture
Background Worker
UPS Provider Abstraction
Read-Only Monitoring
```

---

# 66. Product Success Definition

VoltSense succeeds when a user can:

> **Install/start VoltSense → connect a supported UPS → VoltSense automatically detects it → continuously reads available UPS information → displays the information in a minimal dashboard → updates the dashboard in real time → stores local history — without controlling the UPS and without requiring any paid service.**

This is the core product contract for VoltSense.
