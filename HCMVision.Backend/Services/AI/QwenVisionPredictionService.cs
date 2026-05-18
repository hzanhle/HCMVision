using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace HcmcRainVision.Backend.Services.AI
{
    public class QwenVisionPredictionService : IRainPredictionService
    {
        private const string Prompt = """
Analyze this traffic camera image from Ho Chi Minh City.
Return only valid JSON, with no markdown and no extra text. Do not include reasoning outside the JSON.
Use these exact enum values:
- rain_level: none, light, medium, heavy
- traffic_level: clear, slow, jam, unknown
- confidence: number from 0.0 to 1.0
- reason: short reason in Vietnamese or English
JSON schema:
{"rain_level":"none|light|medium|heavy","traffic_level":"clear|slow|jam|unknown","confidence":0.0,"reason":"short reason"}
""";

        private readonly HttpClient _httpClient;
        private readonly QwenVisionOptions _options;
        private readonly ILogger<QwenVisionPredictionService> _logger;

        public QwenVisionPredictionService(
            HttpClient httpClient,
            IOptions<QwenVisionOptions> options,
            ILogger<QwenVisionPredictionService> logger)
        {
            _httpClient = httpClient;
            _options = options.Value;
            _logger = logger;

            if (_httpClient.BaseAddress == null)
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
            try
            {
                var request = new OllamaGenerateRequest
                {
                    Model = string.IsNullOrWhiteSpace(_options.VisionModel) ? "qwen3-vl:2b" : _options.VisionModel,
                    Prompt = Prompt,
                    Images = new[] { Convert.ToBase64String(imageBytes) },
                    Stream = false,
                    Format = "json"
                };

                using var response = await _httpClient.PostAsJsonAsync("api/generate", request, token);
                if (!response.IsSuccessStatusCode)
                {
                    var body = await response.Content.ReadAsStringAsync(token);
                    _logger.LogWarning("Ollama Qwen request failed: {StatusCode} {Body}", response.StatusCode, body);
                    return ErrorResult($"Error: Ollama {response.StatusCode}");
                }

                var ollamaResponse = await response.Content.ReadFromJsonAsync<OllamaGenerateResponse>(cancellationToken: token);
                var result = ParsePrediction(
                    string.IsNullOrWhiteSpace(ollamaResponse?.Response)
                        ? ollamaResponse?.Thinking
                        : ollamaResponse.Response);
                result.AiModel = ollamaResponse?.Model ?? request.Model;
                return result;
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ollama Qwen prediction failed");
                return ErrorResult($"Error: {ex.GetType().Name}");
            }
        }

        private RainPredictionResult ParsePrediction(string? responseText)
        {
            if (string.IsNullOrWhiteSpace(responseText))
            {
                return ErrorResult("Error: Empty Ollama response");
            }

            var json = ExtractJson(responseText);
            if (string.IsNullOrWhiteSpace(json))
            {
                _logger.LogWarning("Ollama Qwen response did not contain JSON: {Response}", responseText);
                return ErrorResult("Error: Invalid Ollama JSON");
            }

            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                var rainLevel = NormalizeRainLevel(GetString(root, "rain_level", "rainLevel", "rain"));
                var trafficLevel = NormalizeTrafficLevel(GetString(root, "traffic_level", "trafficLevel", "traffic"));
                var confidence = NormalizeConfidence(GetFloat(root, "confidence", "score", "probability"));
                var reason = GetString(root, "reason", "message", "explanation");

                return new RainPredictionResult
                {
                    IsRaining = rainLevel != "none",
                    Confidence = confidence,
                    Message = "Qwen Vision Prediction",
                    RainLevel = rainLevel,
                    TrafficLevel = trafficLevel,
                    AiReason = reason
                };
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Unable to parse Ollama Qwen JSON: {Json}", json);
                return ErrorResult("Error: Invalid Ollama JSON");
            }
        }

        private static string NormalizeBaseUrl(string value)
        {
            var url = string.IsNullOrWhiteSpace(value) ? "http://localhost:11434" : value.Trim();
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
                AiModel = "qwen3-vl"
            };
        }

        private sealed class OllamaGenerateRequest
        {
            [JsonPropertyName("model")]
            public string Model { get; set; } = "qwen3-vl:2b";

            [JsonPropertyName("prompt")]
            public string Prompt { get; set; } = string.Empty;

            [JsonPropertyName("images")]
            public string[] Images { get; set; } = Array.Empty<string>();

            [JsonPropertyName("stream")]
            public bool Stream { get; set; }

            [JsonPropertyName("format")]
            public string Format { get; set; } = "json";
        }

        private sealed class OllamaGenerateResponse
        {
            [JsonPropertyName("model")]
            public string? Model { get; set; }

            [JsonPropertyName("response")]
            public string? Response { get; set; }

            [JsonPropertyName("thinking")]
            public string? Thinking { get; set; }
        }
    }
}
