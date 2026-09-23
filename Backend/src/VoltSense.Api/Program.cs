using Microsoft.EntityFrameworkCore;
using Serilog;
using VoltSense.Api.BackgroundServices;
using VoltSense.Api.Hubs;
using VoltSense.Api.Middleware;
using VoltSense.Application.Interfaces;
using VoltSense.Application.Services;
using VoltSense.Application.UseCases.GetCurrentUps;
using VoltSense.Application.UseCases.GetTelemetryHistory;
using VoltSense.Application.UseCases.GetUpsList;
using VoltSense.Domain.Interfaces;
using VoltSense.Infrastructure.Persistence;
using VoltSense.Infrastructure.Persistence.Repositories;
using VoltSense.Infrastructure.UPS;

// ---------------------------------------------------------------------------
// Bootstrap & Serilog (MUST — structured logging per PRD §34)
// ---------------------------------------------------------------------------
var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, cfg) =>
    cfg.ReadFrom.Configuration(ctx.Configuration)
       .Enrich.FromLogContext()
       .Enrich.WithProperty("Application", "VoltSense.Api")
       .Enrich.WithProperty("MachineName", Environment.MachineName)
       .WriteTo.Console());

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    Log.Logger = new LoggerConfiguration()
        .WriteTo.Console()
        .CreateLogger();
    Log.Fatal(
        "ConnectionStrings:DefaultConnection is not configured. " +
        "Set it via appsettings, environment variable " +
        "(ConnectionStrings__DefaultConnection), or 'dotnet user-secrets'.");
    return;
}

builder.Services.AddDbContext<VoltSenseDbContext>(options =>
    options.UseNpgsql(connectionString));

// ---------------------------------------------------------------------------
// Application / Domain services (Clean Architecture DI — MUST)
// ---------------------------------------------------------------------------
// Repositories: scoped (one per HTTP request / worker cycle).
builder.Services.AddScoped<IUpsRepository, UpsRepository>();

// Application orchestration: scoped so each request / worker cycle
// gets a fresh instance with its own change-detection flags.
builder.Services.AddScoped<IUpsMonitoringService, UpsMonitoringService>();
builder.Services.AddScoped<TelemetryRetentionService>();
builder.Services.AddScoped<GetCurrentUpsHandler>();
builder.Services.AddScoped<GetUpsListHandler>();
builder.Services.AddScoped<GetTelemetryHistoryHandler>();

// Real-time broadcaster: scoped so it shares the same DI scope as the
// monitoring service per cycle. The hub itself is framework-managed.
builder.Services.AddScoped<ITelemetryBroadcaster, SignalRTelemetryBroadcaster>();

// Hardware provider: SINGLETON. Hardware is shared state; a long-lived
// instance lets us cache the open HID stream across many polling cycles
// instead of re-opening it every 5 seconds.
builder.Services.AddSingleton<IUpsProvider, WindowsHidUpsProvider>();

// Background worker: registered as a hosted service.
builder.Services.AddHostedService<UpsMonitoringWorker>();

// ---------------------------------------------------------------------------
// Web layer
// ---------------------------------------------------------------------------
builder.Services
    .AddControllers()
    .AddJsonOptions(o =>
    {
        // Use web defaults (camelCase) so the React/Vite frontend can
        // bind directly without aliasing.
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddSignalR(o =>
{
    o.EnableDetailedErrors = builder.Environment.IsDevelopment();
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "VoltSense API", Version = "v1" });
});

// ---------------------------------------------------------------------------
// Security: bind to localhost only (PRD §35), restrictive CORS
// ---------------------------------------------------------------------------
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicies.LocalFrontend, policy =>
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

builder.Services.AddHealthChecks();

// ---------------------------------------------------------------------------
// Build pipeline
// ---------------------------------------------------------------------------
var app = builder.Build();

// Apply pending migrations automatically on startup. Local-first: the
// user does not have to run 'dotnet ef database update' by hand.
if (app.Configuration.GetValue("Database:AutoMigrate", true))
{
    using var scope = app.Services.CreateScope();
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<VoltSenseDbContext>();
        db.Database.Migrate();
        app.Logger.LogInformation("Database migrations applied successfully");
    }
    catch (Exception ex)
    {
        app.Logger.LogCritical(ex,
            "Database migration failed on startup — refusing to start. " +
            "Verify PostgreSQL is running and ConnectionStrings:DefaultConnection is correct.");
        throw;
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "VoltSense API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseSerilogRequestLogging(o =>
{
    o.MessageTemplate =
        "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
});

app.UseCors(CorsPolicies.LocalFrontend);
app.UseRouting();
app.UseAuthorization();

app.MapControllers();
app.MapHub<UpsHub>("/api/hubs/ups");
app.MapHealthChecks("/health");

app.Run();

// Exposed for WebApplicationFactory<TEntryPoint> in integration tests.
public partial class Program
{
    /// <summary>Named CORS policies — referenced from tests too.</summary>
    public static class CorsPolicies
    {
        public const string LocalFrontend = "LocalFrontend";
    }
}
