using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using System.Security.Claims;
using HcmcRainVision.Backend.Data;
using HcmcRainVision.Backend.Models.Entities;
using HcmcRainVision.Backend.Services.AI;
using HcmcRainVision.Backend.Services.ImageProcessing;
using HcmcRainVision.Backend.Services.Chatbot;
using Microsoft.AspNetCore.Http;
using HcmcRainVision.Backend.Models.DTOs;

namespace HcmcRainVision.Backend.Controllers
{
    // Class DTO để nhận dữ liệu từ Client
    public class ReportDto
    {
        public string CameraId { get; set; } = null!;
        public bool IsRaining { get; set; }
        public string? Note { get; set; }
    }

    public class TestAiRequest
    {
        public IFormFile? ImageFile { get; set; }
        public bool SaveLog { get; set; } = true;
    }

    [ApiController]
    [Route("api/[controller]")]
    public class WeatherController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IRoutePlanningService _routePlanningService;
        private readonly int _imageRetentionHours;

        // Hằng số: Bán kính cảnh báo mưa (đơn vị: độ trong WGS84)
        // 0.009 độ ≈ 1km tại TP.HCM (vĩ độ ~10.8°)
        // LƯU Ý: Trong hệ tọa độ WGS84 (Lat/Long), Buffer tạo ra hình ellipse chứ không phải hình tròn đều
        // do kinh độ co lại khi lên cao vĩ độ. Với TP.HCM (gần xích đạo), sai số nhỏ và chấp nhận được.
        // Để chuẩn xác hơn, cần dùng hệ tọa độ phẳng (VN-2000/UTM) nhưng sẽ phức tạp hơn.
        // Hằng số: Bán kính cảnh báo mưa (đơn vị: độ trong WGS84)
        // 0.009 độ ≈ 1km tại TP.HCM (vĩ độ ~10.8°)
        private const double RAIN_ALERT_RADIUS_DEGREES = 0.009; // ~1km tại HCMC

        // Bán kính đánh giá độ phủ dữ liệu quanh điểm đến (~3km)
        private const double DESTINATION_COVERAGE_RADIUS_DEGREES = 0.027;
        private const double ROUTE_COVERAGE_RADIUS_DEGREES = 0.027;
        private const int MIN_FRESH_ROUTE_CAMERA_COUNT = 3;

        // Hằng số: Bán kính xác thực báo cáo crowdsourcing (khoảng 500m)
        private const double VERIFICATION_RADIUS_DEGREES = 0.005;

        public WeatherController(
            AppDbContext context,
            IRoutePlanningService routePlanningService,
            IConfiguration configuration)
        {
            _context = context;
            _routePlanningService = routePlanningService;
            _imageRetentionHours = Math.Clamp(configuration.GetValue("ImageRetention:RainLogRetentionHours", 24), 1, 168);
        }

        // API: GET api/weather/latest
        // Lấy dữ liệu mới nhất của các camera trong vòng 30 phút qua
        [HttpGet("latest")]
        public async Task<IActionResult> GetLatestWeather()
        {
            // Lấy mốc thời gian 30 phút trước
            var timeLimit = DateTime.UtcNow.AddMinutes(-30);

            var data = await _context.WeatherLogs
                .Where(x => x.Timestamp >= timeLimit && x.Location != null)
                .OrderByDescending(x => x.Timestamp)
                .ToListAsync();

            // Chuyển đổi (Map) sang DTO cho Frontend dễ dùng
            var result = data.Select(x => new 
            {
                Id = x.Id,
                CameraId = x.CameraId,
                Latitude = x.Location?.Y ?? 0,  // Y là Vĩ độ
                Longitude = x.Location?.X ?? 0, // X là Kinh độ
                IsRaining = x.IsRaining,
                RainLevel = x.RainLevel,
                TrafficLevel = x.TrafficLevel,
                Confidence = x.Confidence,
                TimeAgo = GetTimeAgo(x.Timestamp),
                ImageUrl = BuildPublicImageUrl(GetVisibleImageUrl(x)),
                RawImageUrl = GetVisibleImageUrl(x),
                ImageExpiresAtUtc = x.ImageExpiresAtUtc,
                ImageDeletedAtUtc = x.ImageDeletedAtUtc,
                ImageIsRedacted = x.ImageIsRedacted,
                AiModel = x.AiModel,
                AiReason = x.AiReason
            });

            return Ok(result);
        }

        // API: GET api/weather/logs
        // Debug endpoint: xem AI logs gan day, bao gom imageUrl de doi chieu ket qua model.
        [HttpGet("logs")]
        public async Task<IActionResult> GetWeatherLogs(
            [FromQuery] int minutes = 180,
            [FromQuery] int limit = 100,
            [FromQuery] bool onlyWithImages = false)
        {
            if (minutes <= 0 || minutes > 1440)
            {
                return BadRequest(new { message = "minutes phai nam trong khoang 1..1440" });
            }

            limit = Math.Clamp(limit, 1, 500);
            var now = DateTime.UtcNow;
            var timeLimit = now.AddMinutes(-minutes);

            var query = _context.WeatherLogs
                .Where(x => x.Timestamp >= timeLimit);

            if (onlyWithImages)
            {
                query = query.Where(x => !string.IsNullOrEmpty(x.ImageUrl)
                                         && x.ImageDeletedAtUtc == null
                                         && (x.ImageExpiresAtUtc == null || x.ImageExpiresAtUtc > now));
            }

            var logs = await query
                .OrderByDescending(x => x.Timestamp)
                .Take(limit)
                .AsNoTracking()
                .ToListAsync();

            var cameraIds = logs
                .Where(x => !string.IsNullOrEmpty(x.CameraId))
                .Select(x => x.CameraId!)
                .Distinct()
                .ToList();

            var cameraMap = await _context.Cameras
                .Include(c => c.Ward)
                .Where(c => cameraIds.Contains(c.Id))
                .AsNoTracking()
                .ToDictionaryAsync(c => c.Id);

            var data = logs.Select(x =>
            {
                cameraMap.TryGetValue(x.CameraId ?? string.Empty, out var camera);

                return new
                {
                    x.Id,
                    x.CameraId,
                    CameraName = camera?.Name,
                    WardName = camera?.Ward?.WardName,
                    DistrictName = camera?.Ward?.DistrictName,
                    Latitude = x.Location?.Y,
                    Longitude = x.Location?.X,
                    x.IsRaining,
                    x.RainLevel,
                    x.TrafficLevel,
                    x.Confidence,
                    TimestampUtc = x.Timestamp,
                    TimeAgo = GetTimeAgo(x.Timestamp),
                    ImageUrl = BuildPublicImageUrl(GetVisibleImageUrl(x)),
                    RawImageUrl = GetVisibleImageUrl(x),
                    x.ImageExpiresAtUtc,
                    x.ImageDeletedAtUtc,
                    x.ImageIsRedacted,
                    x.AiModel,
                    x.AiReason
                };
            }).ToList();

            return Ok(new
            {
                Count = data.Count,
                Minutes = minutes,
                Limit = limit,
                OnlyWithImages = onlyWithImages,
                Data = data
            });
        }

        // API: GET api/weather/raining-cameras/count
        // Đếm số camera "đang mưa" dựa trên bản ghi mới nhất của mỗi camera trong khoảng thời gian gần đây
        [HttpGet("raining-cameras/count")]
        public async Task<IActionResult> GetRainingCameraCount([FromQuery] int minutes = 30)
        {
            if (minutes <= 0 || minutes > 180)
            {
                return BadRequest(new { message = "minutes phải nằm trong khoảng 1..180" });
            }

            var timeLimit = DateTime.UtcNow.AddMinutes(-minutes);

            var recentLogs = await _context.WeatherLogs
                .Where(x => x.CameraId != null && x.Timestamp >= timeLimit)
                .Select(g => new
                {
                    g.CameraId,
                    g.Timestamp,
                    g.IsRaining,
                    g.RainLevel
                })
                .ToListAsync();

            var rainingCameraCount = recentLogs
                .GroupBy(x => x.CameraId!)
                .Select(g => g.OrderByDescending(x => x.Timestamp).First())
                .Count(x => x.IsRaining || !string.Equals(x.RainLevel, "none", StringComparison.OrdinalIgnoreCase));

            return Ok(new
            {
                Count = rainingCameraCount,
                Minutes = minutes,
                TimeLimitUtc = timeLimit
            });
        }

        // API: GET api/weather/raining-cameras
        // Trả danh sách camera "đang mưa" dựa trên bản ghi mới nhất của mỗi camera trong khoảng thời gian gần đây
        [HttpGet("raining-cameras")]
        public async Task<IActionResult> GetRainingCameras([FromQuery] int minutes = 30)
        {
            if (minutes <= 0 || minutes > 180)
            {
                return BadRequest(new { message = "minutes phải nằm trong khoảng 1..180" });
            }

            var timeLimit = DateTime.UtcNow.AddMinutes(-minutes);

            var recentLogs = await _context.WeatherLogs
                .Where(x => x.CameraId != null && x.Timestamp >= timeLimit)
                .Select(x => new
                {
                    x.CameraId,
                    x.Timestamp,
                    x.IsRaining,
                    x.RainLevel,
                    x.TrafficLevel,
                    x.Confidence,
                    x.ImageUrl,
                    x.ImageExpiresAtUtc,
                    x.ImageDeletedAtUtc,
                    x.ImageIsRedacted
                })
                .ToListAsync();

            var latestByCamera = recentLogs
                .GroupBy(x => x.CameraId!)
                .Select(g => g.OrderByDescending(x => x.Timestamp).First())
                .Where(x => x.IsRaining || !string.Equals(x.RainLevel, "none", StringComparison.OrdinalIgnoreCase))
                .ToList();

            var rainingCameraIds = latestByCamera
                .Select(x => x.CameraId!)
                .Distinct()
                .ToList();

            var cameras = await _context.Cameras
                .Where(c => rainingCameraIds.Contains(c.Id))
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Latitude,
                    c.Longitude,
                    c.WardId,
                    c.Status
                })
                .ToListAsync();

            var data = latestByCamera
                .Join(cameras,
                    log => log.CameraId,
                    cam => cam.Id,
                    (log, cam) => new
                    {
                        CameraId = cam.Id,
                        CameraName = cam.Name,
                        cam.Latitude,
                        cam.Longitude,
                        cam.WardId,
                        CameraStatus = cam.Status,
                        IsRaining = log.IsRaining,
                        RainLevel = log.RainLevel,
                        TrafficLevel = log.TrafficLevel,
                        Confidence = log.Confidence,
                        LastRainAtUtc = log.Timestamp,
                        ImageUrl = BuildPublicImageUrl(GetVisibleImageUrl(log.ImageUrl, log.ImageExpiresAtUtc, log.ImageDeletedAtUtc)),
                        RawImageUrl = GetVisibleImageUrl(log.ImageUrl, log.ImageExpiresAtUtc, log.ImageDeletedAtUtc),
                        log.ImageExpiresAtUtc,
                        log.ImageDeletedAtUtc,
                        log.ImageIsRedacted
                    })
                .OrderByDescending(x => x.LastRainAtUtc)
                .ToList();

            return Ok(new
            {
                Count = data.Count,
                Minutes = minutes,
                TimeLimitUtc = timeLimit,
                Data = data
            });
        }

        // API: POST api/weather/test-ai
        // Test nhanh model AI bằng cách upload ảnh trực tiếp từ Swagger/UI
        [HttpPost("test-ai")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> TestAiDirectly(
            [FromForm] TestAiRequest request,
            [FromServices] IRainPredictionService aiService,
            [FromServices] IImagePreProcessor imagePreProcessor,
            [FromServices] IStoredImageRedactor storedImageRedactor,
            [FromServices] ICloudStorageService cloudService,
            [FromServices] IWebHostEnvironment env)
        {
            var imageFile = request.ImageFile;
            if (imageFile == null || imageFile.Length == 0)
            {
                return BadRequest("Vui lòng tải lên một bức ảnh.");
            }

            using var ms = new MemoryStream();
            await imageFile.CopyToAsync(ms);
            byte[] rawBytes = ms.ToArray();

            byte[] processedBytes = imagePreProcessor.ProcessForAI(rawBytes) ?? rawBytes;
            var result = await aiService.PredictAsync(processedBytes, HttpContext.RequestAborted);

            if (!string.IsNullOrEmpty(result.Message) && result.Message.StartsWith("Error", StringComparison.OrdinalIgnoreCase))
            {
                return StatusCode(500, new
                {
                    Message = "AI model dang gap loi khi du doan.",
                    TechnicalMessage = result.Message,
                    IsAIWorking = false
                });
            }

            int? savedLogId = null;
            ImageStorageResult? savedImage = null;
            string? savedImageUrl = null;

            if (request.SaveLog)
            {
                var fileName = $"manual_test_{DateTime.UtcNow.Ticks}.jpg";
                savedImage = await SaveLogImageAsync(rawBytes, fileName, storedImageRedactor, cloudService, env, HttpContext.RequestAborted);
                savedImageUrl = savedImage?.Url;

                var weatherLog = new WeatherLog
                {
                    CameraId = null,
                    IsRaining = result.RainLevel != "none",
                    RainLevel = result.RainLevel,
                    TrafficLevel = result.TrafficLevel,
                    AiModel = result.AiModel,
                    AiReason = result.AiReason,
                    Confidence = result.Confidence,
                    ImageUrl = savedImageUrl,
                    ImageStorageProvider = savedImage?.Provider,
                    ImagePublicId = savedImage?.PublicId,
                    ImageStoredAtUtc = savedImage?.StoredAtUtc,
                    ImageExpiresAtUtc = savedImage?.ExpiresAtUtc,
                    ImageIsRedacted = savedImage?.IsRedacted ?? false,
                    Timestamp = DateTime.UtcNow,
                    Location = null
                };

                _context.WeatherLogs.Add(weatherLog);
                await _context.SaveChangesAsync(HttpContext.RequestAborted);
                savedLogId = weatherLog.Id;
            }

            return Ok(new
            {
                Message = "Du doan tu AI Model thuc te",
                Prediction = result.IsRaining ? "CO MUA" : "KHONG MUA",
                IsRaining = result.IsRaining,
                RainLevel = result.RainLevel,
                TrafficLevel = result.TrafficLevel,
                ConfidenceScore = Math.Round(result.Confidence * 100, 2) + " %",
                AiModel = result.AiModel,
                AiReason = result.AiReason,
                SavedLogId = savedLogId,
                ImageUrl = BuildPublicImageUrl(savedImageUrl),
                ImageExpiresAtUtc = savedImage?.ExpiresAtUtc,
                ImageIsRedacted = savedImage?.IsRedacted,
                IsAIWorking = true
            });
        }

        // Hàm phụ trợ tính thời gian (VD: "5 phút trước")
        private string GetTimeAgo(DateTime timestamp)
        {
            var span = DateTime.UtcNow - timestamp;
            if (span.TotalMinutes < 1) return "Vừa xong";
            if (span.TotalMinutes < 60) return $"{(int)span.TotalMinutes} phút trước";
            return $"{(int)span.TotalHours} giờ trước";
        }

        private string? BuildPublicImageUrl(string? imageUrl)
        {
            if (string.IsNullOrWhiteSpace(imageUrl))
            {
                return null;
            }

            if (Uri.TryCreate(imageUrl, UriKind.Absolute, out _))
            {
                return imageUrl;
            }

            var path = imageUrl.StartsWith('/') ? imageUrl : $"/{imageUrl}";
            return $"{Request.Scheme}://{Request.Host}{path}";
        }

        private static string? GetVisibleImageUrl(WeatherLog log)
            => GetVisibleImageUrl(log.ImageUrl, log.ImageExpiresAtUtc, log.ImageDeletedAtUtc);

        private static string? GetVisibleImageUrl(
            string? imageUrl,
            DateTime? imageExpiresAtUtc,
            DateTime? imageDeletedAtUtc)
        {
            if (string.IsNullOrWhiteSpace(imageUrl) || imageDeletedAtUtc.HasValue)
            {
                return null;
            }

            if (imageExpiresAtUtc.HasValue && imageExpiresAtUtc.Value <= DateTime.UtcNow)
            {
                return null;
            }

            return imageUrl;
        }

        private async Task<ImageStorageResult?> SaveLogImageAsync(
            byte[] rawImageBytes,
            string fileName,
            IStoredImageRedactor storedImageRedactor,
            ICloudStorageService cloudService,
            IWebHostEnvironment env,
            CancellationToken cancellationToken)
        {
            var redactedImageBytes = storedImageRedactor.RedactForStorage(rawImageBytes);
            if (redactedImageBytes == null)
            {
                return null;
            }

            var storedAtUtc = DateTime.UtcNow;
            var expiresAtUtc = storedAtUtc.AddHours(_imageRetentionHours);
            var cloudResult = await cloudService.UploadImageAsync(
                redactedImageBytes,
                fileName,
                storedAtUtc,
                expiresAtUtc,
                isRedacted: true,
                cancellationToken);
            if (cloudResult != null)
            {
                return cloudResult;
            }

            var webRoot = string.IsNullOrWhiteSpace(env.WebRootPath)
                ? Path.Combine(env.ContentRootPath, "wwwroot")
                : env.WebRootPath;
            var localPath = Path.Combine(webRoot, "images", "rain_logs", fileName);
            Directory.CreateDirectory(Path.GetDirectoryName(localPath)!);
            await System.IO.File.WriteAllBytesAsync(localPath, redactedImageBytes, cancellationToken);

            return new ImageStorageResult(
                $"/images/rain_logs/{fileName}",
                ImageStorageProviders.Local,
                fileName,
                storedAtUtc,
                expiresAtUtc,
                IsRedacted: true);
        }

        // API: POST api/weather/report
        // Cho phép người dùng báo cáo khi AI nhận diện sai (Yêu cầu đăng nhập & xác thực GPS)
        [Authorize]
        [HttpPost("report")]
        public async Task<IActionResult> ReportIncorrectPrediction([FromBody] ReportDto input)
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
            int userId = int.Parse(userIdStr);

            // 1. Lấy thông tin User và Camera
            var user = await _context.Users.FindAsync(userId);
            var camera = await _context.Cameras.FindAsync(input.CameraId);

            if (user == null) return Unauthorized();
            if (camera == null) return NotFound("Không tìm thấy Camera");

            bool isVerified = false;

            // 2. Xác thực vị trí user theo geofence
            var timeLimitForLocation = DateTime.UtcNow.AddMinutes(-30);

            if (user.LastKnownLocation != null && user.LocationUpdatedAt >= timeLimitForLocation)
            {
                var cameraLocation = new Point(camera.Longitude, camera.Latitude) { SRID = 4326 };
                double distance = user.LastKnownLocation.Distance(cameraLocation);

                if (distance <= VERIFICATION_RADIUS_DEGREES)
                {
                    isVerified = true;
                }
            }

            // 3. Lưu báo cáo
            var report = new UserReport 
            {
                CameraId = input.CameraId,
                UserClaimIsRaining = input.IsRaining,
                Note = input.Note,
                UserId = userId,
                Timestamp = DateTime.UtcNow,
                IsVerifiedByLocation = isVerified
            };

            _context.UserReports.Add(report);
            await _context.SaveChangesAsync();

            // 4. Cờ retrain khi có >= 3 báo cáo verified giống nhau trong 15 phút
            if (isVerified)
            {
                var recentReportsTimeLimit = DateTime.UtcNow.AddMinutes(-15);
                var similarVerifiedReportsCount = await _context.UserReports
                    .Where(r => r.CameraId == input.CameraId
                             && r.Timestamp >= recentReportsTimeLimit
                             && r.IsVerifiedByLocation
                             && r.UserClaimIsRaining == input.IsRaining)
                    .CountAsync();

                if (similarVerifiedReportsCount >= 3)
                {
                    var reportsToFlag = await _context.UserReports
                        .Where(r => r.CameraId == input.CameraId
                                 && r.Timestamp >= recentReportsTimeLimit
                                 && r.IsVerifiedByLocation
                                 && r.UserClaimIsRaining == input.IsRaining)
                        .ToListAsync();

                    foreach (var flaggedReport in reportsToFlag)
                    {
                        flaggedReport.IsFlaggedForRetrain = true;
                    }

                    await _context.SaveChangesAsync();
                }
            }

            string responseMsg = isVerified
                ? "Cảm ơn bạn! Báo cáo đã được hệ thống xác thực bằng GPS (Trusted)."
                : "Cảm ơn đóng góp của bạn. Báo cáo đã được ghi nhận.";
            
            return Ok(new { message = responseMsg, isVerified });
        }

        // API: POST api/weather/check-route
        // Kiểm tra xem một lộ trình đi có cắt qua vùng đang mưa không.
        // LƯU Ý: API này KHÔNG tự geocode theo tên nữa, chỉ nhận dữ liệu tọa độ.
        [HttpPost("check-route")]
        public async Task<IActionResult> CheckRouteSafety([FromBody] CheckRouteRequest request, CancellationToken cancellationToken)
        {
            if (request == null)
                return BadRequest("Request không hợp lệ");

            var routePoints = request.RoutePoints
                .Where(p => IsUsableCoordinate(p.Lat, p.Lng))
                .ToList();

            var hasExplicitOrigin = IsUsableDeviceCoordinate(request.OriginLatitude, request.OriginLongitude)
                || routePoints.Count >= 2;
            var hasExplicitDestination = IsUsableDeviceCoordinate(request.DestinationLatitude, request.DestinationLongitude)
                || routePoints.Count >= 2;
            var hasCurrentGpsOrigin = IsUsableDeviceCoordinate(request.CurrentLatitude, request.CurrentLongitude);

            var modeUsed = (hasExplicitOrigin && hasExplicitDestination) || routePoints.Count >= 2
                ? "origin_destination_selected"
                : "gps_to_destination";

            RoutePointDto? resolvedOriginPoint = null;
            RoutePointDto? resolvedDestinationPoint = null;

            try
            {
                RoutePointDto? originPoint = null;
                RoutePointDto? destinationPoint = null;

                // Ưu tiên 1: Origin do FE chọn pin/toạ độ trực tiếp (Google Maps style)
                if (IsUsableDeviceCoordinate(request.OriginLatitude, request.OriginLongitude))
                {
                    originPoint = new RoutePointDto
                    {
                        Lat = request.OriginLatitude.GetValueOrDefault(),
                        Lng = request.OriginLongitude.GetValueOrDefault()
                    };
                }
                // Ưu tiên 2: GPS hiện tại từ thiết bị
                else if (IsUsableDeviceCoordinate(request.CurrentLatitude, request.CurrentLongitude))
                {
                    var currentLat = request.CurrentLatitude.GetValueOrDefault();
                    var currentLng = request.CurrentLongitude.GetValueOrDefault();

                    originPoint = new RoutePointDto
                    {
                        Lat = currentLat,
                        Lng = currentLng
                    };
                }
                // Ưu tiên 3: vị trí lưu gần nhất của user (nếu đã đăng nhập)
                else
                {
                    var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                    if (int.TryParse(userIdStr, out var userId))
                    {
                        var userLocation = await _context.Users
                            .AsNoTracking()
                            .Where(u => u.Id == userId && u.LastKnownLocation != null)
                            .Select(u => new { u.LastKnownLocation, u.LocationUpdatedAt })
                            .FirstOrDefaultAsync(cancellationToken);

                        if (userLocation?.LastKnownLocation != null)
                        {
                            originPoint = new RoutePointDto
                            {
                                Lat = userLocation.LastKnownLocation.Y,
                                Lng = userLocation.LastKnownLocation.X
                            };
                        }
                    }
                }

                if (originPoint != null)
                {
                    resolvedOriginPoint = originPoint;
                    routePoints.Insert(0, originPoint);
                }

                // Destination: chỉ lấy theo toạ độ do FE gửi (không geocode theo tên)
                if (IsUsableDeviceCoordinate(request.DestinationLatitude, request.DestinationLongitude))
                {
                    destinationPoint = new RoutePointDto
                    {
                        Lat = request.DestinationLatitude.GetValueOrDefault(),
                        Lng = request.DestinationLongitude.GetValueOrDefault()
                    };
                }

                if (destinationPoint != null)
                {
                    resolvedDestinationPoint = destinationPoint;
                    // Tránh thêm trùng điểm cuối
                    var hasSameLastPoint = routePoints.Count > 0
                        && Math.Abs(routePoints[^1].Lat - destinationPoint.Lat) < 0.000001
                        && Math.Abs(routePoints[^1].Lng - destinationPoint.Lng) < 0.000001;

                    if (!hasSameLastPoint)
                    {
                        routePoints.Add(destinationPoint);
                    }
                }

                // FE-friendly: Nếu có đủ origin + destination nhưng chưa có polyline, backend tự dựng route theo đường thực tế.
                if (routePoints.Count < 3 && originPoint != null && destinationPoint != null)
                {
                    try
                    {
                        var originText = $"{originPoint.Lat.ToString(System.Globalization.CultureInfo.InvariantCulture)},{originPoint.Lng.ToString(System.Globalization.CultureInfo.InvariantCulture)}";
                        var destinationText = $"{destinationPoint.Lat.ToString(System.Globalization.CultureInfo.InvariantCulture)},{destinationPoint.Lng.ToString(System.Globalization.CultureInfo.InvariantCulture)}";

                        var plannedRoute = await _routePlanningService.BuildRouteAsync(originText, destinationText, cancellationToken);
                        if (plannedRoute.Count >= 2)
                        {
                            routePoints = plannedRoute;
                        }
                    }
                    catch
                    {
                        // Fallback: giữ route tuyến thẳng origin->destination hiện có.
                    }
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = "Không thể xác định vị trí", details = ex.Message });
            }

            // Xác thực lộ trình có ít nhất 2 điểm
            if (routePoints.Count < 2)
                return BadRequest("Lộ trình cần ít nhất 2 điểm. Check-route chỉ nhận theo tọa độ: (1) GPS hiện tại + destinationLatitude/destinationLongitude, hoặc (2) originLatitude/originLongitude + destinationLatitude/destinationLongitude, hoặc routePoints.");

            // 1. Tạo đường dẫn (LineString) từ danh sách điểm
            var coordinates = routePoints.Select(p => new Coordinate(p.Lng, p.Lat)).ToArray();
            var routeLine = new LineString(coordinates) { SRID = 4326 };

            // 2. Lấy các điểm đang mưa trong 30 phút qua từ DB
            var timeLimit = DateTime.UtcNow.AddMinutes(-30);
            var rainingLogs = await _context.WeatherLogs
                .Where(x => (x.IsRaining
                             || x.RainLevel != "none"
                             || x.TrafficLevel == "slow"
                             || x.TrafficLevel == "jam")
                            && x.Timestamp >= timeLimit)
                .Select(x => new { x.Location, x.CameraId, x.RainLevel, x.TrafficLevel, x.Confidence })
                .ToListAsync();

            var warnings = new List<object>();

            var routeCameras = await _context.Cameras
                .AsNoTracking()
                .Select(c => new { c.Id, c.Latitude, c.Longitude })
                .ToListAsync(cancellationToken);

            var routeCameraIds = routeCameras
                .Where(c => new Point(c.Longitude, c.Latitude) { SRID = 4326 }
                    .Distance(routeLine) <= ROUTE_COVERAGE_RADIUS_DEGREES)
                .Select(c => c.Id)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var routeFreshCameraCount = routeCameraIds.Count == 0
                ? 0
                : await _context.WeatherLogs
                    .Where(x => x.Timestamp >= timeLimit
                             && x.CameraId != null
                             && routeCameraIds.Contains(x.CameraId))
                    .Select(x => x.CameraId!)
                    .Distinct()
                    .CountAsync(cancellationToken);

            // 3. Kiểm tra va chạm không gian (Spatial Intersection)
            foreach (var log in rainingLogs)
            {
                if (log.Location == null) continue;

                // Tạo vùng đệm (buffer) quanh điểm mưa
                // Sử dụng RAIN_ALERT_RADIUS_DEGREES (~1km tại TP.HCM)
                var rainZone = log.Location.Buffer(RAIN_ALERT_RADIUS_DEGREES); 

                // Kiểm tra xem lộ trình có đi qua vùng mưa không
                if (routeLine.Intersects(rainZone))
                {
                    warnings.Add(new { 
                        Lat = log.Location.Y, 
                        Lng = log.Location.X,
                        CameraId = log.CameraId,
                        RainLevel = log.RainLevel,
                        TrafficLevel = log.TrafficLevel,
                        Confidence = log.Confidence,
                        Message = log.RainLevel != "none"
                            ? $"Mua gan Camera {log.CameraId}"
                            : $"Giao thong cham/un tac gan Camera {log.CameraId}"
                    });
                }
            }

            var destinationRainHits = 0;
            var destinationCoverageCount = 0;
            var destinationNearbyCameraCount = 0;
            if (resolvedDestinationPoint != null)
            {
                var destinationGeo = new Point(resolvedDestinationPoint.Lng, resolvedDestinationPoint.Lat) { SRID = 4326 };

                destinationRainHits = rainingLogs
                    .Count(x => x.Location != null && x.Location.Distance(destinationGeo) <= RAIN_ALERT_RADIUS_DEGREES);

                if (destinationRainHits > 0)
                {
                    warnings.Add(new
                    {
                        Lat = resolvedDestinationPoint.Lat,
                        Lng = resolvedDestinationPoint.Lng,
                        Message = "Điểm đến đang có vùng mưa lân cận (<= 1km)."
                    });
                }

                destinationNearbyCameraCount = routeCameras
                    .Count(c => new Point(c.Longitude, c.Latitude) { SRID = 4326 }
                        .Distance(destinationGeo) <= DESTINATION_COVERAGE_RADIUS_DEGREES);

                destinationCoverageCount = await _context.WeatherLogs
                    .Where(x => x.Timestamp >= timeLimit
                             && x.CameraId != null
                             && x.Location != null
                             && x.Location.Distance(destinationGeo) <= DESTINATION_COVERAGE_RADIUS_DEGREES)
                    .Select(x => x.CameraId)
                    .Distinct()
                    .CountAsync(cancellationToken);
            }

            var dataQuality = BuildRouteDataQuality(
                routeCameraIds.Count,
                routeFreshCameraCount,
                destinationNearbyCameraCount,
                destinationCoverageCount,
                30);

            bool hasWeatherWarnings = warnings.Count > 0;
            bool isSafe = !hasWeatherWarnings && dataQuality.Status == "ok";
            var riskLevel = hasWeatherWarnings
                ? warnings.Count switch
                {
                    <= 2 => "trung_binh",
                    _ => "cao"
                }
                : dataQuality.Status == "ok" ? "thap" : "chua_du_du_lieu";

            var summary = hasWeatherWarnings
                ? $"Phat hien {warnings.Count} canh bao mua tren lo trinh hoac gan diem den."
                : dataQuality.Status == "ok"
                    ? "Khong phat hien diem mua nguy hiem tren lo trinh trong 30 phut gan day."
                    : "Chua thay canh bao mua/ket xe trong du lieu hien co, nhung du lieu gan tuyen chua du moi/de phu de ket luan chac chan.";

            var recommendation = hasWeatherWarnings
                ? "Nen can nhac doi huong, doi gio di hoac chuan bi ao mua."
                : dataQuality.Status == "ok"
                    ? "Ban co the di chuyen binh thuong, nhung van nen theo doi cap nhat thoi tiet."
                    : "Nen doi chieu them nguon khac hoac xem cap nhat moi truoc khi di.";

            var destinationLabel = resolvedDestinationPoint != null
                ? $"{resolvedDestinationPoint.Lat.ToString(System.Globalization.CultureInfo.InvariantCulture)},{resolvedDestinationPoint.Lng.ToString(System.Globalization.CultureInfo.InvariantCulture)}"
                : null;

            var originLabel = resolvedOriginPoint != null
                ? $"{resolvedOriginPoint.Lat.ToString(System.Globalization.CultureInfo.InvariantCulture)},{resolvedOriginPoint.Lng.ToString(System.Globalization.CultureInfo.InvariantCulture)}"
                : null;
            return Ok(new
            {
                // Payload cũ để tương thích FE hiện tại
                IsSafe = isSafe,
                Warnings = warnings,
                ModeUsed = modeUsed,
                Source = new
                {
                    hasExplicitOrigin,
                    hasExplicitDestination,
                    hasCurrentGpsOrigin
                },
                Diagnostics = new
                {
                    destination = resolvedDestinationPoint,
                    routePointCount = routePoints.Count,
                    rainingLogCount = rainingLogs.Count,
                    destinationRainHits,
                    destinationCoverageCount,
                    destinationNearbyCameraCount,
                    routeNearbyCameraCount = routeCameraIds.Count,
                    routeFreshCameraCount
                },

                // Payload mới dễ hiểu hơn cho FE/UI
                Result = new
                {
                    IsSafe = isSafe,
                    RiskLevel = riskLevel,
                    Summary = summary,
                    Recommendation = recommendation
                },
                RouteInfo = new
                {
                    ModeUsed = modeUsed,
                    Origin = originLabel,
                    Destination = destinationLabel,
                    RoutePointCount = routePoints.Count
                },
                RainInfo = new
                {
                    WarningCount = warnings.Count,
                    DestinationRainHits = destinationRainHits,
                    RainingCameraCountLast30m = rainingLogs.Count,
                    Warnings = warnings
                },
                DataQuality = new
                {
                    dataQuality.Status,
                    dataQuality.IsSufficient,
                    RouteNearbyCameraCount = routeCameraIds.Count,
                    RouteFreshCameraCount30m = routeFreshCameraCount,
                    DestinationNearbyCameraCount = destinationNearbyCameraCount,
                    DestinationCoverageCount30m = destinationCoverageCount,
                    Note = dataQuality.Note
                }
            });
        }

        // API: GET api/weather/heatmap
        // Lấy dữ liệu cho bản đồ nhiệt (Rain Heatmap)
        // Trả về danh sách điểm có mưa với trọng số dựa trên độ tin cậy của AI
        [HttpGet("heatmap")]
        public async Task<IActionResult> GetRainHeatmap()
        {
            var timeLimit = DateTime.UtcNow.AddMinutes(-30);
            
            var rainingLogs = await _context.WeatherLogs
                .Where(x => (x.IsRaining || x.RainLevel != "none") && x.Timestamp >= timeLimit && x.Location != null)
                .Select(x => new 
                {
                    Lat = x.Location!.Y,      // Vĩ độ
                    Lng = x.Location!.X,      // Kinh độ
                    Intensity = x.Confidence  // Độ tin cậy làm cường độ nhiệt
                })
                .ToListAsync();

            return Ok(rainingLogs);
        }

        private static bool IsUsableDeviceCoordinate(double? lat, double? lng)
        {
            if (!lat.HasValue || !lng.HasValue)
            {
                return false;
            }

            // Swagger thường gửi mặc định 0,0 -> xem như chưa có GPS thật.
            if (Math.Abs(lat.Value) < double.Epsilon && Math.Abs(lng.Value) < double.Epsilon)
            {
                return false;
            }

            return lat.Value is >= -90 and <= 90
                && lng.Value is >= -180 and <= 180;
        }

        private static bool IsUsableCoordinate(double lat, double lng)
        {
            if (Math.Abs(lat) < double.Epsilon && Math.Abs(lng) < double.Epsilon)
            {
                return false;
            }

            return lat is >= -90 and <= 90
                && lng is >= -180 and <= 180;
        }

        private static RouteDataQuality BuildRouteDataQuality(
            int routeNearbyCameraCount,
            int routeFreshCameraCount,
            int destinationNearbyCameraCount,
            int destinationFreshCameraCount,
            int recentMinutes)
        {
            if (routeNearbyCameraCount == 0 && destinationNearbyCameraCount == 0)
            {
                return new RouteDataQuality(
                    "no_coverage",
                    false,
                    "Khong co camera gan tuyen/diem den trong vung phu hien tai.");
            }

            if (routeFreshCameraCount == 0 && destinationFreshCameraCount == 0)
            {
                return new RouteDataQuality(
                    "stale",
                    false,
                    $"Chua co log camera moi gan tuyen/diem den trong {recentMinutes} phut gan day.");
            }

            if (routeFreshCameraCount < MIN_FRESH_ROUTE_CAMERA_COUNT)
            {
                return new RouteDataQuality(
                    "limited",
                    false,
                    "Du lieu gan tuyen con it, ket qua chi nen xem la tham khao.");
            }

            return new RouteDataQuality(
                "ok",
                true,
                "Du lieu camera gan tuyen du de tham khao.");
        }

        private sealed record RouteDataQuality(string Status, bool IsSufficient, string Note);

    }
}
