using Microsoft.AspNetCore.Mvc;
using VoltSense.Application.DTOs;
using VoltSense.Application.Mappings;
using VoltSense.Domain.Interfaces;

namespace VoltSense.Api.Controllers;

/// <summary>
/// Per-device live-telemetry endpoints. Returns the most recent stored
/// snapshot. Live updates are pushed via SignalR
/// (<see cref="Hubs.UpsHub"/>); this controller exists so clients that
/// have just connected can hydrate without waiting for the next
/// broadcast.
/// </summary>
[ApiController]
[Route("api/ups/{id:guid}/telemetry")]
[Produces("application/json")]
public sealed class TelemetryController : ControllerBase
{
    /// <summary>How far back to look when searching for "latest" telemetry.</summary>
    private static readonly TimeSpan LatestLookback = TimeSpan.FromMinutes(10);

    private readonly IUpsRepository _repository;
    private readonly ILogger<TelemetryController> _logger;

    public TelemetryController(IUpsRepository repository, ILogger<TelemetryController> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _logger     = logger     ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Return the latest telemetry snapshot for the device, or 404 if
    /// nothing has been recorded in the last 10 minutes.
    /// </summary>
    [HttpGet("latest")]
    [ProducesResponseType(typeof(TelemetryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TelemetryDto>> GetLatest(Guid id, CancellationToken ct)
    {
        var now     = DateTimeOffset.UtcNow;
        var fromCut = now - LatestLookback;

        var snapshots = await _repository
            .GetHistoryAsync(id, fromCut, now, ct)
            .ConfigureAwait(false);

        var latest = snapshots.LastOrDefault();
        if (latest is null)
        {
            _logger.LogInformation(
                "TelemetryController.GetLatest: no recent telemetry for device {DeviceId}",
                id);
            return NotFound(new ProblemDetails
            {
                Title  = "No recent telemetry",
                Status = StatusCodes.Status404NotFound,
                Detail = $"No telemetry has been recorded for device {id} in the last " +
                         $"{LatestLookback.TotalMinutes:F0} minutes."
            });
        }

        return Ok(UpsMappingProfile.ToDto(latest));
    }
}
