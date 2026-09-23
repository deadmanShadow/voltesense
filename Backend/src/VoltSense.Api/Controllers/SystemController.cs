using System.Diagnostics;
using System.Reflection;
using Microsoft.AspNetCore.Mvc;

namespace VoltSense.Api.Controllers;

/// <summary>
/// Liveness / metadata endpoints for VoltSense. Used by orchestrators
/// (Task Manager, uptime monitors, the frontend's "About" panel) to
/// confirm the service is running and to report its build identity.
/// </summary>
[ApiController]
[Route("api/system")]
[Produces("application/json")]
public sealed class SystemController : ControllerBase
{
    private readonly ILogger<SystemController> _logger;

    public SystemController(ILogger<SystemController> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>Liveness probe: returns <c>"running"</c> with the current UTC time.</summary>
    [HttpGet("status")]
    [ProducesResponseType(typeof(SystemStatusResponse), StatusCodes.Status200OK)]
    public IActionResult GetStatus()
    {
        return Ok(new SystemStatusResponse(
            Status:    "running",
            Timestamp: DateTimeOffset.UtcNow));
    }

    /// <summary>Build identity: assembly version, file version, product.</summary>
    [HttpGet("version")]
    [ProducesResponseType(typeof(SystemVersionResponse), StatusCodes.Status200OK)]
    public IActionResult GetVersion()
    {
        var assembly = Assembly.GetExecutingAssembly();
        var asmName  = assembly.GetName();
        var fileVer  = FileVersionInfo.GetVersionInfo(assembly.Location).FileVersion;
        var product  = FileVersionInfo.GetVersionInfo(assembly.Location).ProductName;

        return Ok(new SystemVersionResponse(
            Version:        asmName.Version?.ToString() ?? "0.0.0",
            FileVersion:    string.IsNullOrEmpty(fileVer) ? null : fileVer,
            ProductName:    string.IsNullOrEmpty(product) ? null : product,
            Environment:    Environment.Version.ToString(),
            ProcessId:      Environment.ProcessId,
            MachineName:    Environment.MachineName));
    }

    // DTOs are nested records so the contract is unambiguous at the call site.
    public sealed record SystemStatusResponse(string Status, DateTimeOffset Timestamp);

    public sealed record SystemVersionResponse(
        string Version,
        string? FileVersion,
        string? ProductName,
        string Environment,
        int ProcessId,
        string MachineName);
}
