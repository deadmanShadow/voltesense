namespace VoltSense.Application.DTOs;

/// <summary>
/// Strongly-typed query parameters for the historical-telemetry endpoint.
/// All bounds are inclusive on both ends, half-open in the controller
/// layer per repository convention.
/// <para>
/// Validation rule (enforced by <c>TelemetryValidator</c>):
/// <list type="bullet">
///   <item>From MUST be strictly before To.</item>
///   <item>Window MUST NOT exceed <see cref="MaxWindowDays"/> days.</item>
/// </list>
/// </para>
/// </summary>
public sealed record HistoryQueryDto
{
    /// <summary>
    /// Maximum allowed span of a single history query, in days. Prevents
    /// accidental full-table scans by clients (PRD §44).
    /// </summary>
    public const int MaxWindowDays = 90;

    /// <summary>UTC lower bound (inclusive).</summary>
    public DateTimeOffset From { get; init; }

    /// <summary>UTC upper bound (inclusive).</summary>
    public DateTimeOffset To { get; init; }

    public HistoryQueryDto(DateTimeOffset from, DateTimeOffset to)
    {
        From = from;
        To = to;
    }
}
