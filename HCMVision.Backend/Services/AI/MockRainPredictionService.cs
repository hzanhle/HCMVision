namespace HcmcRainVision.Backend.Services.AI
{
    /// <summary>
    /// Mock service for development/testing when a real AI provider is unavailable.
    /// </summary>
    public class MockRainPredictionService : IRainPredictionService
    {
        private readonly ILogger<MockRainPredictionService> _logger;

        public MockRainPredictionService(ILogger<MockRainPredictionService> logger)
        {
            _logger = logger;
            _logger.LogWarning("Using MockRainPredictionService; no real AI model is active.");
        }

        public RainPredictionResult Predict(byte[] imageBytes)
        {
            var random = new Random();
            var isRain = random.NextDouble() > 0.5;

            return new RainPredictionResult
            {
                IsRaining = isRain,
                Confidence = (float)(0.7 + random.NextDouble() * 0.2),
                Message = "[MOCK] Simulated data",
                RainLevel = isRain ? "medium" : "none",
                TrafficLevel = "unknown",
                AiModel = "MockRainPredictionService"
            };
        }

        public Task<RainPredictionResult> PredictAsync(byte[] imageBytes, CancellationToken token = default)
        {
            return Task.FromResult(Predict(imageBytes));
        }
    }
}
