using System.Diagnostics;
using System.Net;
using System.Text.Json;

namespace VoltSense.Api.Middleware;

/// <summary>
/// Catch-all exception filter for the HTTP request pipeline. Converts
/// any uncaught exception into a sanitised <c>500 Internal Server
/// Error</c> JSON response — internal stack traces and exception types
/// are deliberately NOT leaked to clients.
/// <para>
/// The full exception is logged at error level (with the request path
/// and a correlation id) so operators can correlate the response with
/// the structured log entry. Cancellation is treated as a clean
/// shutdown and is NOT converted to a 500 (PRD §55).
/// </para>
/// </summary>
public sealed class ExceptionHandlingMiddleware
{
    /// <summary>Header name used to correlate a response with its log entry.</summary>
    public const string CorrelationIdHeader = "X-Correlation-Id";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment environment)
    {
        _next        = next        ?? throw new ArgumentNullException(nameof(next));
        _logger      = logger      ?? throw new ArgumentNullException(nameof(logger));
        _environment = environment ?? throw new ArgumentNullException(nameof(environment));
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Stamp the response with a correlation id BEFORE the next
        // middleware runs, so even early failures are correlatable.
        var correlationId = Activity.Current?.Id ?? context.TraceIdentifier;
        context.Response.OnStarting(() =>
        {
            if (!context.Response.Headers.ContainsKey(CorrelationIdHeader))
            {
                context.Response.Headers[CorrelationIdHeader] = correlationId;
            }
            return Task.CompletedTask;
        });

        try
        {
            await _next(context).ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // Client gave up — no response is required; just propagate.
            throw;
        }
        catch (Exception ex)
        {
            await WriteInternalServerErrorAsync(context, ex, correlationId).ConfigureAwait(false);
        }
    }

    private async Task WriteInternalServerErrorAsync(
        HttpContext context, Exception ex, string correlationId)
    {
        _logger.LogError(ex,
            "Unhandled exception processing {Method} {Path} (CorrelationId={CorrelationId})",
            context.Request.Method, context.Request.Path, correlationId);

        // Avoid double-writing if the response has already started.
        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.Clear();
        context.Response.StatusCode  = (int)HttpStatusCode.InternalServerError;
        context.Response.ContentType = "application/json; charset=utf-8";

        var payload = new
        {
            message        = "An unexpected error occurred.",
            correlationId,
            // In Development we expose the exception type so devs can
            // triage faster; in any other environment we keep it opaque.
            exceptionType  = _environment.IsDevelopment() ? ex.GetType().FullName : null,
            detail         = _environment.IsDevelopment() ? ex.Message             : null
        };

        var json = JsonSerializer.Serialize(payload, JsonOptions);
        await context.Response.WriteAsync(json).ConfigureAwait(false);
    }
}
