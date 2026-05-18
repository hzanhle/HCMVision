using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HcmcRainVision.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddWeatherLogRainTrafficLevels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ai_model",
                table: "weather_logs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ai_reason",
                table: "weather_logs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "rain_level",
                table: "weather_logs",
                type: "text",
                nullable: false,
                defaultValue: "none");

            migrationBuilder.AddColumn<string>(
                name: "traffic_level",
                table: "weather_logs",
                type: "text",
                nullable: false,
                defaultValue: "unknown");

            migrationBuilder.Sql("""
                UPDATE weather_logs
                SET rain_level = CASE WHEN "IsRaining" THEN 'medium' ELSE 'none' END
                WHERE rain_level = 'none';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ai_model",
                table: "weather_logs");

            migrationBuilder.DropColumn(
                name: "ai_reason",
                table: "weather_logs");

            migrationBuilder.DropColumn(
                name: "rain_level",
                table: "weather_logs");

            migrationBuilder.DropColumn(
                name: "traffic_level",
                table: "weather_logs");
        }
    }
}
