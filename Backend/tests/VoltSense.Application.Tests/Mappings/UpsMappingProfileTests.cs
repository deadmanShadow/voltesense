using FluentAssertions;
using VoltSense.Application.Mappings;
using VoltSense.Domain.Entities;
using VoltSense.Domain.Enums;

namespace VoltSense.Application.Tests.Mappings;

/// <summary>
/// Unit tests for <see cref="UpsMappingProfile"/>.
/// Confirms the hand-rolled mapping layer preserves null-safety and
/// stringifies enums exactly as the API contract expects.
/// </summary>
public class UpsMappingProfileTests
{
    [Fact]
    public void ToDto_UpsDevice_Should_Preserve_All_Fields_And_Stringify_ConnectionType()
    {
        var now = DateTimeOffset.UtcNow;
        var device = new UpsDevice
        {
            Manufacturer    = "CyberPower",
            Model           = "CP1500",
            SerialNumber    = "CPS-001",
            VendorId        = 0x0764,
            ProductId       = 0x0501,
            ConnectionType  = ConnectionType.UsbHid,
            FirmwareVersion = "1.0.0",
            LastSeenAt      = now,
            IsActive        = true
        };

        var dto = UpsMappingProfile.ToDto(device);

        dto.Id.Should().Be(device.Id);
        dto.Manufacturer.Should().Be("CyberPower");
        dto.Model.Should().Be("CP1500");
        dto.ConnectionType.Should().Be("UsbHid");
        dto.FirmwareVersion.Should().Be("1.0.0");
        dto.LastSeenAt.Should().Be(now);
        dto.IsActive.Should().BeTrue();
    }

    [Fact]
    public void ToDto_TelemetrySnapshot_Should_Preserve_Null_Fields_And_Stringify_Status()
    {
        var now = DateTimeOffset.UtcNow;
        var snapshot = new TelemetrySnapshot
        {
            UpsDeviceId    = Guid.NewGuid(),
            Timestamp      = now,
            BatteryCharge  = 75m,
            BatteryVoltage = 12.4m,
            Status         = UpsStatus.OnBattery
        };

        var dto = UpsMappingProfile.ToDto(snapshot);

        dto.Timestamp.Should().Be(now);
        dto.BatteryCharge.Should().Be(75m);
        dto.BatteryVoltage.Should().Be(12.4m);
        dto.LoadPercentage.Should().BeNull();   // unset fields stay null
        dto.InputVoltage.Should().BeNull();
        dto.Status.Should().Be("OnBattery");
    }

    [Fact]
    public void ToDto_UpsDevice_Should_Throw_On_Null()
    {
        var act = () => UpsMappingProfile.ToDto((UpsDevice)null!);
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void ToDto_TelemetrySnapshot_Should_Throw_On_Null()
    {
        var act = () => UpsMappingProfile.ToDto((TelemetrySnapshot)null!);
        act.Should().Throw<ArgumentNullException>();
    }
}
