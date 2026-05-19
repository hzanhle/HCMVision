namespace HcmcRainVision.Backend.Services.AI
{
    public class RainPredictionResult
    {
        public bool IsRaining { get; set; }

        public float Confidence { get; set; }

        public string Message { get; set; } = string.Empty;

        public string RainLevel { get; set; } = "none";

        public string TrafficLevel { get; set; } = "unknown";

        public string? AiModel { get; set; }

        public string? AiReason { get; set; }
    }
}
