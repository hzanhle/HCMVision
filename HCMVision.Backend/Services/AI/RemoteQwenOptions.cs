namespace HcmcRainVision.Backend.Services.AI
{
    public class RemoteQwenOptions
    {
        public string BaseUrl { get; set; } = string.Empty;
        public string ApiToken { get; set; } = string.Empty;
        public string VisionModel { get; set; } = "Qwen/Qwen3-VL-4B-Instruct";
        public int TimeoutSeconds { get; set; } = 120;
        public bool SessionEnabled { get; set; }
        public int ScanIntervalMinutes { get; set; } = 15;
        public int MaxCamerasPerScan { get; set; } = 20;
        public int DailyMaxInferences { get; set; } = 160;
        public bool SaveAllImages { get; set; }
    }
}
