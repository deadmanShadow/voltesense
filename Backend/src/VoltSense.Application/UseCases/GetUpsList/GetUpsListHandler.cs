using Microsoft.Extensions.Logging;
using VoltSense.Application.DTOs;
using VoltSense.Application.Mappings;
using VoltSense.Domain.Interfaces;

namespace VoltSense.Application.UseCases.GetUpsList;

/// <summary>
/// Use-case handler that returns every UPS device VoltSense has ever
/// recorded (active and inactive). Ordering: descending
/// <c>LastSeenAt</c>, so the most recently seen device is first.
/// </summary>
public sealed class GetUpsListHandler
{
    private readonly IUpsRepository _repository;
    private readonly ILogger<GetUpsListHandler> _logger;

    public GetUpsListHandler(IUpsRepository repository, ILogger<GetUpsListHandler> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<IReadOnlyList<UpsDeviceDto>> HandleAsync(CancellationToken ct)
    {
        var devices = await _repository.GetAllAsync(ct).ConfigureAwait(false);
        _logger.LogDebug("GetUpsList: returned {Count} devices", devices.Count);
        return devices
            .OrderByDescending(d => d.LastSeenAt)
            .Select(UpsMappingProfile.ToDto)
            .ToList();
    }
}
