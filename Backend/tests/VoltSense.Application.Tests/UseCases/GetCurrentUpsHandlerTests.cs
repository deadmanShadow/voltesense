using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using VoltSense.Application.UseCases.GetCurrentUps;
using VoltSense.Domain.Entities;
using VoltSense.Domain.Enums;
using VoltSense.Domain.Interfaces;

namespace VoltSense.Application.Tests.UseCases;

/// <summary>
/// Unit tests for <see cref="GetCurrentUpsHandler"/>.
/// Verifies the active-device lookup path: null when none active,
/// mapped DTO when one is.
/// </summary>
public class GetCurrentUpsHandlerTests
{
    [Fact]
    public async Task HandleAsync_Should_Return_Null_When_No_Active_Device()
    {
        var repository = new Mock<IUpsRepository>();
        repository.Setup(r => r.GetActiveDeviceAsync(It.IsAny<CancellationToken>()))
                  .ReturnsAsync((UpsDevice?)null);

        var sut = new GetCurrentUpsHandler(repository.Object, NullLogger<GetCurrentUpsHandler>.Instance);

        var dto = await sut.HandleAsync(CancellationToken.None);

        dto.Should().BeNull();
    }

    [Fact]
    public async Task HandleAsync_Should_Return_Mapped_Dto_When_Active_Device_Exists()
    {
        var device = new UpsDevice
        {
            Manufacturer    = "Eaton",
            Model           = "5S 1500",
            SerialNumber    = "G8E12345",
            VendorId        = 0x0463,
            ProductId       = 0xFFFF,
            ConnectionType  = ConnectionType.UsbHid,
            FirmwareVersion = "01.6",
            IsActive        = true,
            LastSeenAt      = DateTimeOffset.UtcNow
        };
        var repository = new Mock<IUpsRepository>();
        repository.Setup(r => r.GetActiveDeviceAsync(It.IsAny<CancellationToken>()))
                  .ReturnsAsync(device);

        var sut = new GetCurrentUpsHandler(repository.Object, NullLogger<GetCurrentUpsHandler>.Instance);

        var dto = await sut.HandleAsync(CancellationToken.None);

        dto.Should().NotBeNull();
        dto!.Id.Should().Be(device.Id);
        dto.Manufacturer.Should().Be("Eaton");
        dto.Model.Should().Be("5S 1500");
        dto.ConnectionType.Should().Be(nameof(ConnectionType.UsbHid));
        dto.IsActive.Should().BeTrue();
    }
}
