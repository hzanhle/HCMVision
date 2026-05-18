using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace HcmcRainVision.Backend.Services.AI
{
    public class RemoteQwenVisionPredictionService : IRainPredictionService
    {
        private readonly HttpClient _httpClient;
        private readonly RemoteQwenOptions _options;
        private readonly ILogger<RemoteQwenVisionPredictionService> _logger;

        public RemoteQwenVisionPredictionService(
            HttpClient httpClient,
            IOptions<RemoteQwenOptions> options,
            ILogger<RemoteQwenVisionPredictionService> logger)
        {
            _httpClient = httpClient;
            _options = options.Value;
            _logger = logger;

            if (!string.IsNullOrWhiteSpace(_options.BaseUrl) && _httpClient.BaseAddress == null)
            {
                _httpClient.BaseAddress = new Uri(NormalizeBaseUrl(_options.BaseUrl));
            }

            _httpClient.Timeout = TimeSpan.FromSeconds(Math.Clamp(_options.TimeoutSeconds, 10, 300));
        }

        public RainPredictionResult Predict(byte[] imageBytes)
        {
            return PredictAsync(imageBytes).GetAwaiter().GetResult();
        }

        public async Task<RainPredictionResult> PredictAsync(byte[] imageBytes, CancellationToken token = default)
        {
            if (!_options.SessionEnabled)
            {
                return ErrorResult("Error: RemoteQwen session disabled");
            }

            if (_httpClient.BaseAddress == null || string.IsNullOrWhiteSpace(_options.BaseUrl))
            {
                return ErrorResult("Error: RemoteQwen BaseUrl missing");
            }

            try
            {
                using var form = new MultipartFormDataContent();
                using var imageContent = new ByteArrayContent(imageBytes);
                imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
                form.Add(imageContent, "image", "camera.jpg");

                using var request = new HttpRequestMessage(HttpMethod.Post, "predict")
                {
                    Content = form
                };

                if (!string.IsNullOrWhiteSpace(_options.ApiToken))
                {
                    request.Headers.TryAddWithoutValidation("X-AI-Token", _options.ApiToken);
                }

                using var response = await _httpClient.SendAsync(request, token);
                var body = await response.Content.ReadAsStringAsync(token);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("RemoteQwen request failed: {StatusCode} {Body}", response.StatusCode, body);
                    return ErrorResult($"Error: RemoteQwen {response.StatusCode}");
                }

                var result = ParsePrediction(body);
                if (string.IsNullOrWhiteSpace(result.AiModel))
                {
                    result.AiModel = _options.VisionModel;
                }

                return result;
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "RemoteQwen prediction failed");
                return ErrorResult($"Error: {ex.GetType().Name}");
            }
        }

        private RainPredictionResult ParsePrediction(string responseText)
        {
            if (string.IsNullOrWhiteSpace(responseText))
            {
                return ErrorResult("Error: Empty RemoteQwen response");
            }

            var json = ExtractJson(responseText);
            if (string.IsNullOrWhiteSpace(json))
            {
                _logger.LogWarning("RemoteQwen response did not contain JSON: {Response}", responseText);
                return ErrorResult("Error: Invalid RemoteQwen JSON");
            }

            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                var rainLevel = NormalizeRainLevel(GetString(root, "rain_level", "rainLevel", "rain"));
                var trafficLevel = NormalizeTrafficLevel(GetString(root, "traffic_level", "trafficLevel", "traffic"));
                var confidence = NormalizeConfidence(GetFloat(root, "confidence", "score", "probability"));
                var reason = GetString(root, "reason", "message", "explanation");
                var model = GetString(root, "model", "ai_model", "aiModel");

                return new RainPredictionResult
                {
                    IsRaining = rainLevel != "none",
                    Confidence = confidence,
                    Message = "Remote Qwen Vision Prediction",
                    RainLevel = rainLevel,
                    TrafficLevel = trafficLevel,
                    AiReason = reason,
                    AiModel = model
                };
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Unable to parse RemoteQwen JSON: {Json}", json);
                return ErrorResult("Error: Invalid RemoteQwen JSON");
            }
        }

        private static string NormalizeBaseUrl(string value)
        {
            var url = value.Trim();
            return url.EndsWith('/') ? url : $"{url}/";
        }

        private static string? ExtractJson(string value)
        {
            var trimmed = value.Trim();
            if (trimmed.StartsWith('{') && trimmed.EndsWith('}'))
            {
                return trimmed;
            }

            var start = trimmed.IndexOf('{');
            var end = trimmed.LastIndexOf('}');
            if (start >= 0 && end > start)
            {
                return trimmed.Substring(start, end - start + 1);
            }

            return null;
        }

        private static string? GetString(JsonElement root, params string[] names)
        {
            foreach (var name in names)
            {
                if (!root.TryGetProperty(name, out var value))
                {
                    continue;
                }

                return value.ValueKind switch
                {
                    JsonValueKind.String => value.GetString(),
                    JsonValueKind.Number => value.GetRawText(),
                    JsonValueKind.True => "true",
                    JsonValueKind.False => "false",
                    _ => value.GetRawText()
                };
            }

            return null;
        }

        private static float GetFloat(JsonElement root, params string[] names)
        {
            foreach (var name in names)
            {
                if (!root.TryGetProperty(name, out var value))
                {
                    continue;
                }

                if (value.ValueKind == JsonValueKind.Number && value.TryGetSingle(out var number))
                {
                    return number;
                }

                if (value.ValueKind == JsonValueKind.String &&
                    float.TryParse(value.GetString(), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var parsed))
                {
                    return parsed;
                }
            }

            return 0f;
        }

        private static float NormalizeConfidence(float confidence)
        {
            if (confidence > 1f)
            {
                confidence /= 100f;
            }

            return Math.Clamp(confidence, 0f, 1f);
        }

        private static string NormalizeRainLevel(string? value)
        {
            var normalized = (value ?? string.Empty).Trim().ToLowerInvariant();
            return normalized switch
            {
                "heavy" or "storm" or "severe" or "high" => "heavy",
                "medium" or "moderate" => "medium",
                "light" or "drizzle" or "low" => "light",
                "none" or "no" or "no_rain" or "no-rain" or "dry" or "clear" or "false" => "none",
                _ => "none"
            };
        }

        private static string NormalizeTrafficLevel(string? value)
        {
            var normalized = (value ?? string.Empty).Trim().ToLowerInvariant();
            return normalized switch
            {
                "clear" or "free" or "free_flow" or "normal" => "clear",
                "slow" or "moderate" or "busy" => "slow",
                "jam" or "congested" or "heavy" or "blocked" => "jam",
                _ => "unknown"
            };
        }

        private static RainPredictionResult ErrorResult(string message)
        {
            return new RainPredictionResult
            {
                IsRaining = false,
                Confidence = 0f,
                Message = message,
                RainLevel = "none",
                TrafficLevel = "unknown",
                AiModel = "RemoteQwen"
            };
        }
    }
}
