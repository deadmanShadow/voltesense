using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace VoltSense.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ups_devices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Manufacturer = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Model = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    SerialNumber = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    VendorId = table.Column<int>(type: "integer", nullable: false),
                    ProductId = table.Column<int>(type: "integer", nullable: false),
                    ConnectionType = table.Column<int>(type: "integer", nullable: false),
                    FirmwareVersion = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    FirstDetectedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastSeenAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ups_devices", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "connection_events",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UpsDeviceId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventType = table.Column<int>(type: "integer", nullable: false),
                    Message = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    OccurredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_connection_events", x => x.Id);
                    table.ForeignKey(
                        name: "FK_connection_events_ups_devices_UpsDeviceId",
                        column: x => x.UpsDeviceId,
                        principalTable: "ups_devices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "telemetry_snapshots",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UpsDeviceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Timestamp = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    BatteryCharge = table.Column<decimal>(type: "numeric", nullable: true),
                    BatteryVoltage = table.Column<decimal>(type: "numeric", nullable: true),
                    LoadPercentage = table.Column<decimal>(type: "numeric", nullable: true),
                    InputVoltage = table.Column<decimal>(type: "numeric", nullable: true),
                    OutputVoltage = table.Column<decimal>(type: "numeric", nullable: true),
                    RuntimeSeconds = table.Column<int>(type: "integer", nullable: true),
                    Temperature = table.Column<decimal>(type: "numeric", nullable: true),
                    Frequency = table.Column<decimal>(type: "numeric", nullable: true),
                    Power = table.Column<decimal>(type: "numeric", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_telemetry_snapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_telemetry_snapshots_ups_devices_UpsDeviceId",
                        column: x => x.UpsDeviceId,
                        principalTable: "ups_devices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_connection_events_device_occurred_at",
                table: "connection_events",
                columns: new[] { "UpsDeviceId", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "ix_telemetry_snapshots_device_timestamp",
                table: "telemetry_snapshots",
                columns: new[] { "UpsDeviceId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "ix_ups_devices_is_active",
                table: "ups_devices",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "ix_ups_devices_natural_key",
                table: "ups_devices",
                columns: new[] { "VendorId", "ProductId", "SerialNumber" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "connection_events");

            migrationBuilder.DropTable(
                name: "telemetry_snapshots");

            migrationBuilder.DropTable(
                name: "ups_devices");
        }
    }
}
