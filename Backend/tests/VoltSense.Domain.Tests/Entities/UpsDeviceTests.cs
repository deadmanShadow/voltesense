using FluentAssertions;
using VoltSense.Domain.Entities;
using VoltSense.Domain.Enums;

namespace VoltSense.Domain.Tests.Entities;

/// <summary>
/// Unit tests for the <see cref="UpsDevice"/> entity — invariant
/// checks for default values, generated ids, and the navigation
/// collection initialisation that downstream EF code depends on.
/// </summary>
public class UpsDeviceTests
{
    [Fact]
    public void New_UpsDevice_Should_Have_NonEmpty_Guid_Id()
    {
        var device = new UpsDevice();

        device.Id.Should().NotBe(Guid.Empty);
    }

    [Fact]
    public void New_UpsDevice_Should_Default_Manufacturer_And_Model_To_Empty_String_Not_Null()
    {
        var device = new UpsDevice();

        device.Manufacturer.Should().NotBeNull().And.BeEmpty();
        device.Model.Should().NotBeNull().And.BeEmpty();
    }

    [Fact]
    public void New_UpsDevice_Should_Initialise_Navigation_Collections_To_Empty_Lists()
    {
        var device = new UpsDevice();

        device.TelemetrySnapshots.Should().NotBeNull().And.BeEmpty();
        device.ConnectionEvents.Should().NotBeNull().And.BeEmpty();
    }

    [Fact]
    public void New_UpsDevice_Should_Default_CreatedAt_To_Recent_Utc_Time()
    {
        var before = DateTimeOffset.UtcNow.AddSeconds(-1);
        var device = new UpsDevice();
        var after  = DateTimeOffset.UtcNow.AddSeconds(1);

        device.CreatedAt.Should().BeOnOrAfter(before).And.BeOnOrBefore(after);
        device.UpdatedAt.Should().BeOnOrAfter(before).And.BeOnOrBefore(after);
    }

    [Fact]
    public void UpsDevice_Should_Accept_Scalar_Setters()
    {
        var device = new UpsDevice
        {
            Manufacturer    = "APC",
            Model           = "Back-UPS Pro 1500",
            SerialNumber    = "AS1923150001",
            VendorId        = 0x051D,
            ProductId       = 0x0003,
            ConnectionType  = ConnectionType.UsbHid,
            FirmwareVersion = "02.5",
            IsActive        = true
        };

        device.Manufacturer.Should().Be("APC");
        device.Model.Should().Be("Back-UPS Pro 1500");
        device.SerialNumber.Should().Be("AS1923150001");
        device.VendorId.Should().Be(0x051D);
        device.ProductId.Should().Be(0x0003);
        device.ConnectionType.Should().Be(ConnectionType.UsbHid);
        device.FirmwareVersion.Should().Be("02.5");
        device.IsActive.Should().BeTrue();
    }
}
