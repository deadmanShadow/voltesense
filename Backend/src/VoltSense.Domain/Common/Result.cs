namespace VoltSense.Domain.Common;

/// <summary>
/// Domain-level error category. Concrete providers map low-level exceptions
/// to one of these so the rest of the system can react consistently.
/// </summary>
public enum ErrorKind
{
    /// <summary>No UPS is currently reachable.</summary>
    NotFound = 0,

    /// <summary>The device is reachable but did not respond in time.</summary>
    Timeout = 1,

    /// <summary>The device returned data that does not match the expected schema.</summary>
    InvalidPayload = 2,

    /// <summary>A hardware / OS-level error occurred (USB enumeration, claim, …).</summary>
    Hardware = 3,

    /// <summary>Catch-all for anything that does not fit the categories above.</summary>
    Unknown = 99
}

/// <summary>
/// Lightweight, allocation-free description of a failure.
/// Intentionally a <c>readonly record struct</c> so it is cheap to pass around
/// and trivially copyable across layers.
/// </summary>
public readonly record struct Error(ErrorKind Kind, string Message)
{
    public static Error NotFound(string message) => new(ErrorKind.NotFound, message);
    public static Error Timeout(string message) => new(ErrorKind.Timeout, message);
    public static Error InvalidPayload(string message) => new(ErrorKind.InvalidPayload, message);
    public static Error Hardware(string message) => new(ErrorKind.Hardware, message);
    public static Error Unknown(string message) => new(ErrorKind.Unknown, message);
}

/// <summary>
/// Discriminated-union result type for operations that can fail in expected,
/// non-exceptional ways. Use <see cref="Success"/> / <see cref="Failure"/>
/// factories; do <b>not</b> throw for expected error paths.
/// <para>
/// Example:
/// <code>
/// return Result&lt;UpsTelemetry&gt;.Failure(Error.Timeout("device busy"));
/// </code>
/// </para>
/// </summary>
public readonly record struct Result<T>
{
    public T? Value { get; }
    public Error? Error { get; }
    public bool IsSuccess => Error is null;
    public bool IsFailure => Error is not null;

    private Result(T? value, Error? error)
    {
        Value = value;
        Error = error;
    }

    public static Result<T> Success(T value) => new(value, null);

    public static Result<T> Failure(Error error) => new(default, error);

    /// <summary>Implicit conversion so call sites can <c>return someValue;</c>.</summary>
    public static implicit operator Result<T>(T value) => Success(value);

    /// <summary>Implicit conversion so call sites can <c>return Error.X(...);</c>.</summary>
    public static implicit operator Result<T>(Error error) => Failure(error);
}

/// <summary>
/// Non-generic <see cref="Result"/> for operations that either succeed with
/// no payload or fail with an <see cref="Error"/>.
/// </summary>
public readonly record struct Result
{
    public Error? Error { get; }
    public bool IsSuccess => Error is null;
    public bool IsFailure => Error is not null;

    private Result(Error? error) => Error = error;

    public static Result Success() => new(null);
    public static Result Failure(Error error) => new(error);

    public static implicit operator Result(Error error) => Failure(error);
}
