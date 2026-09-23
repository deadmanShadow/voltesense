using VoltSense.Domain.ValueObjects;

namespace VoltSense.Domain.Interfaces;

/// <summary>
/// Single-responsibility abstraction for "give me one telemetry snapshot".
/// Kept separate from <see cref="IUpsProvider"/> so the byte-level HID parser
/// can be unit-tested without a fake detector.
/// </summary>
public interface IUpsTelemetryReader
{
    /// <summary>
    /// Read one telemetry snapshot. Returns <c>null</c> when the device is
    /// not reachable or the read failed — implementations MUST NOT throw.
    /// </summary>
    Task<UpsTelemetry?> ReadAsync(CancellationToken ct = default);
}
