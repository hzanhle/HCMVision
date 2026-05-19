using System.ComponentModel.DataAnnotations;
using NetTopologySuite.Geometries;

namespace HcmcRainVision.Backend.Models.Entities
{
    public class WeatherLog
    {
        [Key]
        public int Id { get; set; }

        public string? CameraId { get; set; }

        /// <summary>
        /// Denormalized camera position at capture time for fast GIS queries and stable history.
        /// </summary>
        public Point? Location { get; set; }

        public bool IsRaining { get; set; }

        public string RainLevel { get; set; } = "none";

        public string TrafficLevel { get; set; } = "unknown";

        public string? AiModel { get; set; }

        public string? AiReason { get; set; }

        public float Confidence { get; set; }

        public DateTime Timestamp { get; set; }

        public string? ImageUrl { get; set; }

        public string? ImageStorageProvider { get; set; }

        public string? ImagePublicId { get; set; }

        public DateTime? ImageStoredAtUtc { get; set; }

        public DateTime? ImageExpiresAtUtc { get; set; }

        public DateTime? ImageDeletedAtUtc { get; set; }

        public bool ImageIsRedacted { get; set; }
    }
}
