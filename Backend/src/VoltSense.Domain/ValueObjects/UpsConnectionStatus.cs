namespace VoltSense.Domain.ValueObjects;

/// <summary>
/// Immutable result of a connection probe against the UPS provider.
/// <para>
/// <see cref="IsConnected"/> is the only authoritative signal — when it is
/// <c>false</c>, the rest of the system MUST keep scanning and MUST NOT throw.
/// </para>
/// <para>
/// <see cref="Reason"/> is null on success and a short, safe, non-PII message
/// on failure (e.g. "device busy", "USB enumeration failed"). It is for
/// logging / diagnostics only — never shown verbatim to end users.
/// </para>
/// </summary>
public sealed record UpsConnectionStatus(bool IsConnected, string? Reason);
