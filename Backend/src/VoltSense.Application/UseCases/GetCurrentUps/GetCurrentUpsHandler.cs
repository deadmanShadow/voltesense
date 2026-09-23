using Microsoft.Extensions.Logging;
using VoltSense.Application.DTOs;
using VoltSense.Application.Mappings;
using VoltSense.Domain.Interfaces;

namespace VoltSense.Application.UseCases.GetCurrentUps;

/// <summary>
/// Use-case handler that returns the single active UPS device, or
/// <c>null</c> when none is plugged in. Designed to be invoked directly
/// from <c>UpsController.GetCurrent</c> without any further mapping.
/// </summary>
public sealed class GetCurrentUpsHandler
{
    private readonly IUpsRepository _repository;
    private readonly ILogger<GetCurrentUpsHandler> _logger;

    public GetCurrentUpsHandler(IUpsRepository repository, ILogger<GetCurrentUpsHandler> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<UpsDeviceDto?> HandleAsync(CancellationToken ct)
    {
        var device = await _repository.GetActiveDeviceAsync(ct).ConfigureAwait(false);
        if (device is null)
        {
            _logger.LogDebug("GetCurrentUps: no active device");
            return null;
        }

        return UpsMappingProfile.ToDto(device);
    }
}
