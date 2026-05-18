namespace HcmcRainVision.Backend.Services.AI
{
    public class QwenVisionOptions
    {
        public string BaseUrl { get; set; } = "http://localhost:11434";
        public string VisionModel { get; set; } = "qwen3-vl:2b";
        public int TimeoutSeconds { get; set; } = 120;
    }
}
