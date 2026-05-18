using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using HcmcRainVision.Backend.Data;
using HcmcRainVision.Backend.Models.DTOs;
using HcmcRainVision.Backend.Models.Entities;
using HcmcRainVision.Backend.Utils;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace HcmcRainVision.Backend.Services.Chatbot
{
    public interface IChatbotService
    {
        Task<string> GetResponseAsync(string userMessage, CancellationToken cancellationToken = default);
        Task<string> GetRainContextAsync(CancellationToken cancellationToken = default);
    }

    public class ChatbotService : IChatbotService
    {
        private const int RecentMinutes = 60;
        private const float ConfidenceThreshold = 0.65f;
        private const double RouteAlertRadiusDegrees = 0.009; // about 1km in HCMC
        private const string GeminiEndpoint =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

        private readonly AppDbContext _db;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IRoutePlanningService _routePlanningService;
        private readonly string _apiKey;
        private readonly ILogger<ChatbotService> _logger;

        public ChatbotService(
            AppDbContext db,
            IHttpClientFactory httpClientFactory,
            IRoutePlanningService routePlanningService,
            IConfiguration configuration,
            ILogger<ChatbotService> logger)
        {
            _db = db;
            _httpClientFactory = httpClientFactory;
            _routePlanningService = routePlanningService;
            _apiKey = configuration["Gemini:ApiKey"] ?? string.Empty;
            _logger = logger;
        }

        public async Task<string> GetResponseAsync(string userMessage, CancellationToken cancellationToken = default)
        {
            var routeResponse = await TryBuildRouteResponseAsync(userMessage, cancellationToken);
            if (!string.IsNullOrWhiteSpace(routeResponse))
            {
                return routeResponse;
            }

            var rainContext = await BuildRainContextAsync(cancellationToken);
            return await CallGeminiAsync(userMessage, rainContext, cancellationToken);
        }

        public Task<string> GetRainContextAsync(CancellationToken cancellationToken = default)
            => BuildRainContextAsync(cancellationToken);

        private async Task<string?> TryBuildRouteResponseAsync(string userMessage, CancellationToken cancellationToken)
        {
            if (!LooksLikeRouteQuestion(userMessage))
            {
                return null;
            }

            var endpoints = ExtractRouteEndpoints(userMessage);
            if (endpoints == null)
            {
                return "Ban cho minh diem di va diem den cu the hon, vi du: tu Quan 1 den Quan 7.";
            }

            var cameras = await _db.Cameras
                .Include(c => c.Ward)
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            var origin = ResolveRoutePlace(endpoints.Origin, cameras);
            var destination = ResolveRoutePlace(endpoints.Destination, cameras);

            if (origin == null || destination == null)
            {
                var missing = origin == null && destination == null
                    ? "diem di va diem den"
                    : origin == null ? "diem di" : "diem den";

                return $"Minh chua map duoc {missing} vao du lieu camera/quan/phuong hien co. Ban gui ro hon ten quan, phuong, camera hoac toa do lat,lng nhe.";
            }

            var routePoints = await BuildRoutePointsAsync(origin, destination, cancellationToken);
            var warnings = await FindRouteWarningsAsync(routePoints, cameras, cancellationToken);

            return FormatRouteResponse(origin, destination, routePoints.Count, warnings);
        }

        private async Task<string> BuildRainContextAsync(CancellationToken cancellationToken)
        {
            try
            {
                var timeLimit = DateTime.UtcNow.AddMinutes(-RecentMinutes);

                var cameras = await _db.Cameras
                    .Include(c => c.Ward)
                    .AsNoTracking()
                    .ToListAsync(cancellationToken);

                var logs = await _db.WeatherLogs
                    .Where(l => l.Timestamp >= timeLimit)
                    .AsNoTracking()
                    .ToListAsync(cancellationToken);

                if (!logs.Any())
                {
                    return $"Hien tai chua co du lieu mua/giao thong moi trong {RecentMinutes} phut gan day.";
                }

                var cameraMap = cameras.ToDictionary(c => c.Id, c => new CameraArea(
                    c.Ward?.DistrictName ?? "Khong xac dinh",
                    c.Ward?.WardName ?? "Khong xac dinh"));

                var matchedLogs = logs
                    .Where(l => l.CameraId != null && cameraMap.ContainsKey(l.CameraId))
                    .ToList();

                var latestByCamera = matchedLogs
                    .GroupBy(l => l.CameraId!)
                    .Select(g => g.OrderByDescending(l => l.Timestamp).First())
                    .ToList();

                if (!latestByCamera.Any())
                {
                    return $"Hien tai chua co du lieu camera hop le trong {RecentMinutes} phut gan day.";
                }

                var grouped = latestByCamera
                    .GroupBy(l => cameraMap[l.CameraId!].District)
                    .Select(g =>
                    {
                        var logsInDistrict = g.ToList();
                        var rainLogs = logsInDistrict
                            .Where(l => IsRain(l) && l.Confidence >= ConfidenceThreshold)
                            .ToList();
                        var trafficLogs = logsInDistrict
                            .Where(l => IsBadTraffic(l.TrafficLevel))
                            .ToList();

                        return new
                        {
                            District = g.Key,
                            Total = logsInDistrict.Count,
                            RainCount = rainLogs.Count,
                            RainLevel = PickWorstRainLevel(rainLogs.Select(l => l.RainLevel)),
                            TrafficCount = trafficLogs.Count,
                            TrafficLevel = PickWorstTrafficLevel(trafficLogs.Select(l => l.TrafficLevel))
                        };
                    })
                    .OrderBy(x => x.District)
                    .ToList();

                var wardDetails = latestByCamera
                    .GroupBy(l => new
                    {
                        cameraMap[l.CameraId!].District,
                        cameraMap[l.CameraId!].Ward
                    })
                    .Select(g =>
                    {
                        var items = g.ToList();
                        return new
                        {
                            g.Key.District,
                            g.Key.Ward,
                            RainLevel = PickWorstRainLevel(items.Where(IsRain).Select(l => l.RainLevel)),
                            TrafficLevel = PickWorstTrafficLevel(items.Select(l => l.TrafficLevel)),
                            CameraCount = items.Count
                        };
                    })
                    .OrderBy(x => x.District)
                    .ThenBy(x => x.Ward)
                    .ToList();

                var lines = new List<string>
                {
                    $"Thoi diem cap nhat: {VietnamTime.Now:HH:mm} gio VN",
                    $"Du lieu gan nhat: {latestByCamera.Count} camera trong {RecentMinutes} phut",
                    "=== Mua va giao thong theo khu vuc ==="
                };

                foreach (var district in grouped)
                {
                    var rainStatus = district.RainCount > 0
                        ? $"mua {district.RainLevel} ({district.RainCount}/{district.Total} camera)"
                        : $"khong mua ({district.Total} camera)";
                    var trafficStatus = district.TrafficCount > 0
                        ? $"giao thong {district.TrafficLevel} ({district.TrafficCount}/{district.Total} camera)"
                        : "chua thay tac duong";

                    lines.Add($"- {district.District}: {rainStatus}; {trafficStatus}");
                }

                lines.Add("=== Chi tiet phuong/xa ===");
                foreach (var ward in wardDetails)
                {
                    lines.Add($"- {ward.Ward} ({ward.District}): rain={ward.RainLevel}, traffic={ward.TrafficLevel}, cameras={ward.CameraCount}");
                }

                return string.Join("\n", lines);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unable to build rain/traffic context for chatbot");
                return "Khong the lay du lieu mua/giao thong tai thoi diem nay.";
            }
        }

        private async Task<string> CallGeminiAsync(string userMessage, string rainContext, CancellationToken cancellationToken)
        {
            if (string.IsNullOrEmpty(_apiKey))
            {
                return "Chatbot chua duoc cau hinh API key. Cac cau hoi tuyen duong co the dung du lieu DB truc tiep neu ban gui ro diem di/den.";
            }

            var systemPrompt = $"""
You are the HCMCRainVision weather and traffic assistant for Ho Chi Minh City.

Use only the provided system data. Do not invent weather, rain, traffic, or route facts.
Answer in Vietnamese, short and practical, maximum 3-4 sentences.

If the user asks about a route, prioritize whether areas along that route have rain_level != none or traffic_level slow/jam.
If the route origin/destination is missing or cannot be mapped, ask for a clearer origin and destination.
Keep compatibility with old rain data: isRaining means rain_level is not none.

REAL SYSTEM DATA FROM RECENT CAMERA AI LOGS:
{rainContext}
""";

            var requestBody = new
            {
                system_instruction = new
                {
                    parts = new[] { new { text = systemPrompt } }
                },
                contents = new[]
                {
                    new
                    {
                        role = "user",
                        parts = new[] { new { text = userMessage } }
                    }
                },
                generationConfig = new
                {
                    maxOutputTokens = 400,
                    temperature = 0.2
                }
            };

            var json = JsonSerializer.Serialize(requestBody);
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(20);

            try
            {
                var response = await client.PostAsync(
                    $"{GeminiEndpoint}?key={_apiKey}",
                    new StringContent(json, Encoding.UTF8, "application/json"),
                    cancellationToken);

                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Gemini API failed {Status}: {Body}", response.StatusCode, responseBody);
                    return "Khong the ket noi voi tro ly AI luc nay. Vui long thu lai sau.";
                }

                using var doc = JsonDocument.Parse(responseBody);
                var text = doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString();

                return text ?? "Khong co phan hoi tu tro ly AI.";
            }
            catch (TaskCanceledException)
            {
                return "Tro ly AI phan hoi qua cham. Vui long thu lai.";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Gemini API call failed");
                return "Da xay ra loi khi xu ly cau hoi. Vui long thu lai.";
            }
        }

        private async Task<List<RoutePointDto>> BuildRoutePointsAsync(
            ResolvedPlace origin,
            ResolvedPlace destination,
            CancellationToken cancellationToken)
        {
            var originText = origin.ToCoordinateText();
            var destinationText = destination.ToCoordinateText();

            try
            {
                var plannedRoute = await _routePlanningService.BuildRouteAsync(originText, destinationText, cancellationToken);
                if (plannedRoute.Count >= 2)
                {
                    return plannedRoute;
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Route planner failed. Falling back to a straight line.");
            }

            return new List<RoutePointDto>
            {
                new() { Lat = origin.Latitude, Lng = origin.Longitude },
                new() { Lat = destination.Latitude, Lng = destination.Longitude }
            };
        }

        private async Task<List<RouteWarning>> FindRouteWarningsAsync(
            List<RoutePointDto> routePoints,
            List<Camera> cameras,
            CancellationToken cancellationToken)
        {
            if (routePoints.Count < 2)
            {
                return new List<RouteWarning>();
            }

            var coordinates = routePoints.Select(p => new Coordinate(p.Lng, p.Lat)).ToArray();
            var routeLine = new LineString(coordinates) { SRID = 4326 };
            var timeLimit = DateTime.UtcNow.AddMinutes(-RecentMinutes);

            var logs = await _db.WeatherLogs
                .Where(l => l.Timestamp >= timeLimit && l.Location != null)
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            var relevantLogs = logs
                .Where(l => IsRain(l) || IsBadTraffic(l.TrafficLevel))
                .GroupBy(l => l.CameraId ?? $"log-{l.Id}")
                .Select(g => g.OrderByDescending(l => l.Timestamp).First())
                .Where(l => l.Location != null && l.Location.Distance(routeLine) <= RouteAlertRadiusDegrees)
                .ToList();

            var cameraMap = cameras.ToDictionary(c => c.Id, c => c);

            return relevantLogs
                .Select(l =>
                {
                    cameraMap.TryGetValue(l.CameraId ?? string.Empty, out var camera);
                    var area = camera?.Ward?.WardName ?? camera?.Ward?.DistrictName ?? camera?.Name ?? "khong xac dinh";
                    return new RouteWarning(
                        CameraId: l.CameraId,
                        Area: area,
                        RainLevel: NormalizeRainLevel(l.RainLevel),
                        TrafficLevel: NormalizeTrafficLevel(l.TrafficLevel),
                        Confidence: l.Confidence,
                        Timestamp: l.Timestamp);
                })
                .OrderByDescending(w => RainRank(w.RainLevel))
                .ThenByDescending(w => TrafficRank(w.TrafficLevel))
                .ThenByDescending(w => w.Confidence)
                .ToList();
        }

        private static string FormatRouteResponse(
            ResolvedPlace origin,
            ResolvedPlace destination,
            int routePointCount,
            List<RouteWarning> warnings)
        {
            if (!warnings.Any())
            {
                return $"Tuyen {origin.Label} -> {destination.Label}: chua thay mua hoac tac duong dang ke trong {RecentMinutes} phut gan day. Du lieu dua tren {routePointCount} diem route va camera gan tuyen, ban van nen theo doi cap nhat moi truoc khi di.";
            }

            var rainLevel = PickWorstRainLevel(warnings.Select(w => w.RainLevel));
            var trafficLevel = PickWorstTrafficLevel(warnings.Select(w => w.TrafficLevel));
            var topAreas = string.Join(", ", warnings
                .Select(w => w.Area)
                .Where(a => !string.IsNullOrWhiteSpace(a))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(4));

            var trafficText = trafficLevel is "slow" or "jam"
                ? $"Giao thong: {trafficLevel}."
                : "Chua thay tac duong ro rang.";

            return $"Tuyen {origin.Label} -> {destination.Label}: co {warnings.Count} diem can chu y gan tuyen trong {RecentMinutes} phut gan day. Mua: {rainLevel}. {trafficText} Khu vuc gan canh bao: {topAreas}. Nen can nhac doi gio, doi huong hoac chuan bi ao mua.";
        }

        private static bool LooksLikeRouteQuestion(string message)
        {
            var normalized = $" {NormalizeText(message)} ";
            return normalized.Contains(" tu ", StringComparison.Ordinal)
                && (normalized.Contains(" den ", StringComparison.Ordinal)
                    || normalized.Contains(" toi ", StringComparison.Ordinal)
                    || normalized.Contains(" qua ", StringComparison.Ordinal))
                || normalized.Contains(" lo trinh ", StringComparison.Ordinal)
                || normalized.Contains(" duong di ", StringComparison.Ordinal)
                || normalized.Contains(" tuyen duong ", StringComparison.Ordinal)
                || normalized.Contains(" route ", StringComparison.Ordinal)
                || (normalized.Contains(" dang o ", StringComparison.Ordinal)
                    && (normalized.Contains(" qua ", StringComparison.Ordinal)
                        || normalized.Contains(" den ", StringComparison.Ordinal)
                        || normalized.Contains(" toi ", StringComparison.Ordinal)));
        }

        private static RouteEndpoints? ExtractRouteEndpoints(string message)
        {
            var normalized = NormalizeText(message);
            var explicitRoute = Regex.Match(
                normalized,
                @"(?:^|\s)tu\s+(?<origin>.+?)\s+(?:den|toi|qua)\s+(?<destination>.+)$",
                RegexOptions.IgnoreCase | RegexOptions.Singleline);

            if (explicitRoute.Success)
            {
                return CleanRouteEndpoints(explicitRoute.Groups["origin"].Value, explicitRoute.Groups["destination"].Value);
            }

            var currentPlaceRoute = Regex.Match(
                normalized,
                @"(?:^|\s)(?:dang\s+o|o)\s+(?<origin>.+?)\s+(?:muon\s+)?(?:di\s+)?(?:den|toi|qua)\s+(?<destination>.+)$",
                RegexOptions.IgnoreCase | RegexOptions.Singleline);

            if (currentPlaceRoute.Success)
            {
                return CleanRouteEndpoints(currentPlaceRoute.Groups["origin"].Value, currentPlaceRoute.Groups["destination"].Value);
            }

            return null;
        }

        private static RouteEndpoints? CleanRouteEndpoints(string origin, string destination)
        {
            origin = CleanEndpoint(origin);
            destination = CleanEndpoint(destination);

            if (string.IsNullOrWhiteSpace(origin) || string.IsNullOrWhiteSpace(destination))
            {
                return null;
            }

            return new RouteEndpoints(origin, destination);
        }

        private static string CleanEndpoint(string value)
        {
            var cleaned = Regex.Replace(value, @"\s+", " ").Trim(' ', '.', ',', '?', '!');
            cleaned = Regex.Replace(
                cleaned,
                @"\s+(co\s+)?(mua|tac|ket|ngap|an\s+toan|nguy\s+hiem|khong|ko|k)\b.*$",
                string.Empty,
                RegexOptions.IgnoreCase);

            return cleaned.Trim(' ', '.', ',', '?', '!');
        }

        private static ResolvedPlace? ResolveRoutePlace(string input, List<Camera> cameras)
        {
            if (TryParseCoordinate(input, out var lat, out var lng))
            {
                return new ResolvedPlace(input, lat, lng);
            }

            var query = NormalizeText(input);
            if (query.Length < 2)
            {
                return null;
            }

            var matches = cameras
                .Where(c => ContainsNormalized(c.Name, query)
                    || ContainsNormalized(c.Ward?.WardName, query)
                    || ContainsNormalized(c.Ward?.DistrictName, query)
                    || ContainsNormalized(c.Ward?.Alias, query))
                .ToList();

            if (!matches.Any())
            {
                return null;
            }

            var label = PickPlaceLabel(input, matches);
            var latAverage = matches.Average(c => c.Latitude);
            var lngAverage = matches.Average(c => c.Longitude);
            return new ResolvedPlace(label, latAverage, lngAverage);
        }

        private static bool TryParseCoordinate(string input, out double lat, out double lng)
        {
            lat = 0;
            lng = 0;

            var match = Regex.Match(
                input,
                @"(?<lat>-?\d+(?:\.\d+)?)\s*,\s*(?<lng>-?\d+(?:\.\d+)?)",
                RegexOptions.CultureInvariant);

            if (!match.Success)
            {
                return false;
            }

            return double.TryParse(match.Groups["lat"].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out lat)
                && double.TryParse(match.Groups["lng"].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out lng)
                && lat is >= -90 and <= 90
                && lng is >= -180 and <= 180;
        }

        private static string PickPlaceLabel(string input, List<Camera> matches)
        {
            var exactDistrict = matches
                .Select(c => c.Ward?.DistrictName)
                .FirstOrDefault(d => string.Equals(NormalizeText(d), NormalizeText(input), StringComparison.Ordinal));
            if (!string.IsNullOrWhiteSpace(exactDistrict))
            {
                return exactDistrict;
            }

            var exactWard = matches
                .Select(c => c.Ward?.WardName)
                .FirstOrDefault(w => string.Equals(NormalizeText(w), NormalizeText(input), StringComparison.Ordinal));
            if (!string.IsNullOrWhiteSpace(exactWard))
            {
                return exactWard;
            }

            var first = matches[0];
            return first.Ward?.DistrictName ?? first.Ward?.WardName ?? first.Name;
        }

        private static bool ContainsNormalized(string? source, string query)
        {
            var normalizedSource = NormalizeText(source);
            if (string.IsNullOrWhiteSpace(normalizedSource))
            {
                return false;
            }

            return normalizedSource.Contains(query, StringComparison.Ordinal)
                || query.Contains(normalizedSource, StringComparison.Ordinal);
        }

        private static string NormalizeText(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            var decomposed = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder(decomposed.Length);

            foreach (var c in decomposed)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                {
                    builder.Append(c);
                }
            }

            return Regex.Replace(builder.ToString().Replace('đ', 'd'), @"\s+", " ").Trim();
        }

        private static bool IsRain(WeatherLog log)
            => log.IsRaining || NormalizeRainLevel(log.RainLevel) != "none";

        private static bool IsBadTraffic(string? trafficLevel)
            => NormalizeTrafficLevel(trafficLevel) is "slow" or "jam";

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

        private static string PickWorstRainLevel(IEnumerable<string?> values)
            => values.Select(NormalizeRainLevel).OrderByDescending(RainRank).FirstOrDefault() ?? "none";

        private static string PickWorstTrafficLevel(IEnumerable<string?> values)
            => values.Select(NormalizeTrafficLevel).OrderByDescending(TrafficRank).FirstOrDefault() ?? "unknown";

        private static int RainRank(string? value)
            => NormalizeRainLevel(value) switch
            {
                "heavy" => 3,
                "medium" => 2,
                "light" => 1,
                _ => 0
            };

        private static int TrafficRank(string? value)
            => NormalizeTrafficLevel(value) switch
            {
                "jam" => 3,
                "slow" => 2,
                "clear" => 1,
                _ => 0
            };

        private sealed record CameraArea(string District, string Ward);

        private sealed record RouteEndpoints(string Origin, string Destination);

        private sealed record ResolvedPlace(string Label, double Latitude, double Longitude)
        {
            public string ToCoordinateText()
                => $"{Latitude.ToString(CultureInfo.InvariantCulture)},{Longitude.ToString(CultureInfo.InvariantCulture)}";
        }

        private sealed record RouteWarning(
            string? CameraId,
            string Area,
            string RainLevel,
            string TrafficLevel,
            float Confidence,
            DateTime Timestamp);
    }
}
