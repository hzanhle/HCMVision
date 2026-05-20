using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using HcmcRainVision.Backend.Services.AI;
using Microsoft.Extensions.Options;

namespace HcmcRainVision.Backend.Services.Chatbot
{
    public interface IRemoteQwenChatClient
    {
        Task<string> GetReplyAsync(
            string systemPrompt,
            string userMessage,
            CancellationToken cancellationToken = default);
    }

    public class RemoteQwenChatClient : IRemoteQwenChatClient
    {
        private const string UnavailableMessage =
            "Tro ly AI chua san sang. Vui long kiem tra RemoteQwen runtime va thu lai sau.";

        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

        private readonly HttpClient _httpClient;
        private readonly RemoteQwenOptions _options;
        private readonly ILogger<RemoteQwenChatClient> _logger;

        public RemoteQwenChatClient(
            HttpClient httpClient,
            IOptions<RemoteQwenOptions> options,
            ILogger<RemoteQwenChatClient> logger)
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

        public async Task<string> GetReplyAsync(
            string systemPrompt,
            string userMessage,
            CancellationToken cancellationToken = default)
        {
            if (!_options.SessionEnabled)
            {
                return UnavailableMessage;
            }

            if (_httpClient.BaseAddress == null || string.IsNullOrWhiteSpace(_options.BaseUrl))
            {
                return UnavailableMessage;
            }

            var body = new RemoteQwenChatRequest
            {
                SystemPrompt = systemPrompt,
                Message = userMessage,
                MaxTokens = 400,
                Temperature = 0.2
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, "chat")
            {
                Content = new StringContent(
                    JsonSerializer.Serialize(body, JsonOptions),
                    Encoding.UTF8,
                    "application/json")
            };

            if (!string.IsNullOrWhiteSpace(_options.ApiToken))
            {
                request.Headers.TryAddWithoutValidation("X-AI-Token", _options.ApiToken);
            }

            try
            {
                using var response = await _httpClient.SendAsync(request, cancellationToken);
                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("RemoteQwen chat failed: {StatusCode} {Body}", response.StatusCode, responseBody);
                    return UnavailableMessage;
                }

                var chatResponse = JsonSerializer.Deserialize<RemoteQwenChatResponse>(responseBody, JsonOptions);
                if (string.IsNullOrWhiteSpace(chatResponse?.Reply))
                {
                    _logger.LogWarning("RemoteQwen chat returned an empty reply: {Body}", responseBody);
                    return "Khong co phan hoi tu tro ly AI.";
                }

                return chatResponse.Reply.Trim();
            }
            catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                return "Tro ly AI phan hoi qua cham. Vui long thu lai.";
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "RemoteQwen chat call failed");
                return UnavailableMessage;
            }
        }

        private static string NormalizeBaseUrl(string value)
        {
            var url = value.Trim();
            return url.EndsWith('/') ? url : $"{url}/";
        }

        private sealed class RemoteQwenChatRequest
        {
            [JsonPropertyName("system_prompt")]
            public string SystemPrompt { get; set; } = string.Empty;

            [JsonPropertyName("message")]
            public string Message { get; set; } = string.Empty;

            [JsonPropertyName("max_tokens")]
            public int MaxTokens { get; set; } = 400;

            [JsonPropertyName("temperature")]
            public double Temperature { get; set; } = 0.2;
        }

        private sealed class RemoteQwenChatResponse
        {
            [JsonPropertyName("reply")]
            public string? Reply { get; set; }

            [JsonPropertyName("model")]
            public string? Model { get; set; }
        }
    }
}
