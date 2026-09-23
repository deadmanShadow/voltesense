using Microsoft.AspNetCore.Mvc;
using VoltSense.Application.DTOs;
using VoltSense.Application.UseCases.GetCurrentUps;
using VoltSense.Application.UseCases.GetUpsList;
using VoltSense.Domain.Entities;
using VoltSense.Domain.Interfaces;

namespace VoltSense.Api.Controllers;

/// <summary>
/// Read-only REST surface for UPS device metadata.
/// <para>
/// <b>No write / control endpoint exists on this controller.</b> By
/// design, VoltSense never exposes shutdown / restart / self-test /
/// configuration endpoints (PRD §10 / §23 / §62 rule 7). The only HTTP
/// verbs allowed here are <c>GET</c>.
/// </para>
/// </summary>
[ApiController]
[Route("api/ups")]
[Produces("application/json")]
public sealed class UpsController : ControllerBase
{
    private readonly GetUpsListHandler _getUpsList;
    private readonly GetCurrentUpsHandler _getCurrentUps;
    private readonly IUpsRepository _repository;
    private readonly ILogger<UpsController> _logger;

    public UpsController(
        GetUpsListHandler getUpsList,
        GetCurrentUpsHandler getCurrentUps,
        IUpsRepository repository,
        ILogger<UpsController> logger)
    {
        _getUpsList    = getUpsList    ?? throw new ArgumentNullException(nameof(getUpsList));
        _getCurrentUps = getCurrentUps ?? throw new ArgumentNullException(nameof(getCurrentUps));
        _repository    = repository    ?? throw new ArgumentNullException(nameof(repository));
        _logger        = logger        ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>List every UPS device VoltSense has ever recorded.</summary>
    /// <remarks>Ordered by <c>LastSeenAt</c> descending.</remarks>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<UpsDeviceDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<UpsDeviceDto>>> GetAll(CancellationToken ct)
    {
        var devices = await _getUpsList.HandleAsync(ct).ConfigureAwait(false);
        return Ok(devices);
    }

    /// <summary>Return the currently-active UPS, or 404 if none is plugged in.</summary>
    [HttpGet("current")]
    [ProducesResponseType(typeof(UpsDeviceDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UpsDeviceDto>> GetCurrent(CancellationToken ct)
    {
        var device = await _getCurrentUps.HandleAsync(ct).ConfigureAwait(false);
        return device is null
            ? NotFound(new ProblemDetails
            {
                Title  = "No UPS detected",
                Status = StatusCodes.Status404NotFound,
                Detail = "Plug a UPS into a USB port and wait up to one monitoring interval."
            })
            : Ok(device);
    }

    /// <summary>Look up a UPS by its surrogate primary key.</summary>
    [HttpGet("{id:guid}", Name = nameof(GetById))]
    [ProducesResponseType(typeof(UpsDeviceDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UpsDeviceDto>> GetById(Guid id, CancellationToken ct)
    {
        var device = await _repository.GetByIdAsync(id, ct).ConfigureAwait(false);
        if (device is null)
        {
            _logger.LogInformation("UpsController.GetById: device {DeviceId} not found", id);
            return NotFound();
        }
        return Ok(UpsDeviceToDto(device));
    }

    private static UpsDeviceDto UpsDeviceToDto(UpsDevice d) => new(
        Id:              d.Id,
        Manufacturer:    d.Manufacturer,
        Model:           d.Model,
        ConnectionType:  d.ConnectionType.ToString(),
        FirmwareVersion: d.FirmwareVersion,
        LastSeenAt:      d.LastSeenAt,
        IsActive:        d.IsActive);
}
