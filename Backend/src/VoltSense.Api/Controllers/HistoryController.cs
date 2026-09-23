using Microsoft.AspNetCore.Mvc;
using VoltSense.Application.DTOs;
using VoltSense.Application.UseCases.GetTelemetryHistory;

namespace VoltSense.Api.Controllers;

/// <summary>
/// Historical telemetry query endpoint. Returns stored
/// <c>TelemetrySnapshot</c> rows for a device in the half-open window
/// [<c>from</c>, <c>to</c>], ordered ascending by timestamp.
/// <para>
/// Defaults: when <c>from</c> or <c>to</c> are omitted, the window is
/// the last 24 hours. Maximum window: <see cref="HistoryQueryDto.MaxWindowDays"/> days.
/// </para>
/// </summary>
[ApiController]
[Route("api/ups/{id:guid}/history")]
[Produces("application/json")]
public sealed class HistoryController : ControllerBase
{
    private readonly GetTelemetryHistoryHandler _getHistory;
    private readonly ILogger<HistoryController> _logger;

    public HistoryController(
        GetTelemetryHistoryHandler getHistory,
        ILogger<HistoryController> logger)
    {
        _getHistory = getHistory ?? throw new ArgumentNullException(nameof(getHistory));
        _logger     = logger     ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Return historical telemetry for a device. <c>from</c> and
    /// <c>to</c> are inclusive on both ends and bound to
    /// <see cref="HistoryQueryDto.MaxWindowDays"/> days.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<TelemetryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<TelemetryDto>>> GetHistory(
        Guid id,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        CancellationToken ct)
    {
        var fromDate = from ?? DateTimeOffset.UtcNow.AddDays(-1);
        var toDate   = to   ?? DateTimeOffset.UtcNow;

        var query = new HistoryQueryDto(fromDate, toDate);

        try
        {
            var snapshots = await _getHistory.HandleAsync(id, query, ct).ConfigureAwait(false);
            return Ok(snapshots);
        }
        catch (ArgumentException ex)
        {
            _logger.LogInformation(ex,
                "HistoryController.GetHistory: invalid query for device {DeviceId}",
                id);
            return BadRequest(new ProblemDetails
            {
                Title  = "Invalid history query",
                Status = StatusCodes.Status400BadRequest,
                Detail = ex.Message
            });
        }
    }
}
