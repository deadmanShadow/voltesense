using Microsoft.Extensions.Logging;
using VoltSense.Application.DTOs;
using VoltSense.Application.Mappings;
using VoltSense.Application.Validators;
using VoltSense.Domain.Interfaces;

namespace VoltSense.Application.UseCases.GetTelemetryHistory;

/// <summary>
/// Use-case handler that returns the historical telemetry rows for a
/// device, sorted ascending by <c>Timestamp</c>.
/// <para>
/// The supplied query is validated by <see cref="TelemetryValidator"/>
/// before any database call is made — invalid input throws
/// <see cref="ArgumentException"/> rather than silently producing
/// surprising results.
/// </para>
/// </summary>
public sealed class GetTelemetryHistoryHandler
{
    private readonly IUpsRepository _repository;
    private readonly ILogger<GetTelemetryHistoryHandler> _logger;

    public GetTelemetryHistoryHandler(IUpsRepository repository, ILogger<GetTelemetryHistoryHandler> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<IReadOnlyList<TelemetryDto>> HandleAsync(
        Guid deviceId,
        HistoryQueryDto query,
        CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);

        TelemetryValidator.ValidateHistoryQuery(query);

        var snapshots = await _repository
            .GetHistoryAsync(deviceId, query.From, query.To, ct)
            .ConfigureAwait(false);

        _logger.LogDebug(
            "GetTelemetryHistory: device={DeviceId} from={From:o} to={To:o} rows={Rows}",
            deviceId, query.From, query.To, snapshots.Count);

        return snapshots.Select(UpsMappingProfile.ToDto).ToList();
    }
}
