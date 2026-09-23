using VoltSense.Domain.ValueObjects;

namespace VoltSense.Domain.Interfaces;

/// <summary>
/// Single-responsibility abstraction for "scan the bus and tell me what's there".
/// Kept separate from <see cref="IUpsProvider"/> so the read-only monitoring
/// path can be tested independently of bus enumeration (and vice-versa).
/// </summary>
public interface IUpsDeviceDetector
{
    /// <summary>
    /// Enumerate every UPS-like device currently visible.
    /// Implementations MUST filter by HID usage page / known vendor ID —
    /// never assume that any HID device is a UPS.
    /// </summary>
    Task<IReadOnlyList<UpsDeviceInfo>> ScanAsync(CancellationToken ct = default);
}
