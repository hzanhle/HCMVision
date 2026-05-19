using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HcmcRainVision.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddWeatherLogImageRetentionMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "image_deleted_at_utc",
                table: "weather_logs",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "image_expires_at_utc",
                table: "weather_logs",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "image_is_redacted",
                table: "weather_logs",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "image_public_id",
                table: "weather_logs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "image_storage_provider",
                table: "weather_logs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "image_stored_at_utc",
                table: "weather_logs",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE weather_logs
                SET
                    image_storage_provider = CASE
                        WHEN "ImageUrl" ILIKE '%cloudinary.com%' THEN 'cloudinary'
                        WHEN "ImageUrl" ILIKE '/images/rain_logs/%' OR "ImageUrl" ILIKE '%/images/rain_logs/%' THEN 'local'
                        ELSE image_storage_provider
                    END,
                    image_stored_at_utc = COALESCE(image_stored_at_utc, "Timestamp"),
                    image_expires_at_utc = COALESCE(image_expires_at_utc, "Timestamp" + interval '24 hours'),
                    image_is_redacted = false
                WHERE "ImageUrl" IS NOT NULL AND "ImageUrl" <> '';
                """);

            migrationBuilder.CreateIndex(
                name: "ix_weather_logs_image_retention",
                table: "weather_logs",
                columns: new[] { "image_deleted_at_utc", "image_expires_at_utc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_weather_logs_image_retention",
                table: "weather_logs");

            migrationBuilder.DropColumn(
                name: "image_deleted_at_utc",
                table: "weather_logs");

            migrationBuilder.DropColumn(
                name: "image_expires_at_utc",
                table: "weather_logs");

            migrationBuilder.DropColumn(
                name: "image_is_redacted",
                table: "weather_logs");

            migrationBuilder.DropColumn(
                name: "image_public_id",
                table: "weather_logs");

            migrationBuilder.DropColumn(
                name: "image_storage_provider",
                table: "weather_logs");

            migrationBuilder.DropColumn(
                name: "image_stored_at_utc",
                table: "weather_logs");
        }
    }
}
