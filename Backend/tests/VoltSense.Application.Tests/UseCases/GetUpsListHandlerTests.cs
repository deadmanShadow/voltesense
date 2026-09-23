using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using VoltSense.Application.UseCases.GetUpsList;
using VoltSense.Domain.Entities;
using VoltSense.Domain.Enums;
using VoltSense.Domain.Interfaces;

namespace VoltSense.Application.Tests.UseCases;

/// <summary>
/// Unit tests for <see cref="GetUpsListHandler"/>.
/// Confirms that returned DTOs are ordered by <c>LastSeenAt</c>
/// descending (most recently seen first).
/// </summary>
public class GetUpsListHandlerTests
{
    [Fact]
    public async Task HandleAsync_Should_Return_Dtos_Ordered_By_LastSeenAt_Descending()
    {
        var newest = new UpsDevice
        {
            Manufacturer = "APC",
            Model = "Newest",
            VendorId = 1, ProductId = 2,
            ConnectionType = ConnectionType.UsbHid,
            LastSeenAt = DateTimeOffset.UtcNow,
            IsActive = true
        };
        var older = new UpsDevice
        {
            Manufacturer = "APC",
            Model = "Older",
            VendorId = 3, ProductId = 4,
            ConnectionType = ConnectionType.UsbHid,
            LastSeenAt = DateTimeOffset.UtcNow.AddDays(-1),
            IsActive = false
        };

        var repository = new Mock<IUpsRepository>();
        // The handler must NOT mutate the order; supply intentionally reversed.
        repository.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
                  .ReturnsAsync(new List<UpsDevice> { older, newest });

        var sut = new GetUpsListHandler(repository.Object, NullLogger<GetUpsListHandler>.Instance);

        var dtos = await sut.HandleAsync(CancellationToken.None);

        dtos.Should().HaveCount(2);
        dtos[0].Model.Should().Be("Newest");
        dtos[1].Model.Should().Be("Older");
    }

    [Fact]
    public async Task HandleAsync_Should_Return_Empty_List_When_Repository_Has_No_Devices()
    {
        var repository = new Mock<IUpsRepository>();
        repository.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
                  .ReturnsAsync(Array.Empty<UpsDevice>());

        var sut = new GetUpsListHandler(repository.Object, NullLogger<GetUpsListHandler>.Instance);

        var dtos = await sut.HandleAsync(CancellationToken.None);

        dtos.Should().BeEmpty();
    }
}
