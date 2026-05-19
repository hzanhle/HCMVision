using HcmcRainVision.Backend.Data;
using HcmcRainVision.Backend.Models.Entities;
using HcmcRainVision.Backend.Services.ImageProcessing;
using Microsoft.EntityFrameworkCore;

namespace HcmcRainVision.Backend.BackgroundJobs
{
    public class ImageRetentionCleanupWorker : BackgroundService
    {
        private const int DefaultRetentionHours = 24;
        private const int DefaultCleanupIntervalMinutes = 60;
        private const int DefaultBatchSize = 100;
        private const string RainLogFolder = "images/rain_logs";

        private readonly IServiceProvider _serviceProvider;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<ImageRetentionCleanupWorker> _logger;
        private readonly int _retentionHours;
        private readonly int _cleanupIntervalMinutes;
        private readonly int _batchSize;

        public ImageRetentionCleanupWorker(
            IServiceProvider serviceProvider,
            IWebHostEnvironment env,
            IConfiguration configuration,
            ILogger<ImageRetentionCleanupWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _env = env;
            _logger = logger;
            _retentionHours = Math.Clamp(
                configuration.GetValue("ImageRetention:RainLogRetentionHours", DefaultRetentionHours),
                1,
                168);
            _cleanupIntervalMinutes = Math.Clamp(
                configuration.GetValue("ImageRetention:CleanupIntervalMinutes", DefaultCleanupIntervalMinutes),
                5,
                1440);
            _batchSize = Math.Clamp(
                configuration.GetValue("ImageRetention:CleanupBatchSize", DefaultBatchSize),
                1,
                500);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation(
                "Image retention cleanup worker started. Retention={RetentionHours}h, interval={IntervalMinutes}m.",
                _retentionHours,
                _cleanupIntervalMinutes);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CleanupExpiredImagesAsync(stoppingToken);
                    await CleanupOrphanLocalFilesAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    _logger.LogInformation("Image retention cleanup worker is stopping.");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Image retention cleanup failed.");
                }

                await Task.Delay(TimeSpan.FromMinutes(_cleanupIntervalMinutes), stoppingToken);
            }
        }

        private async Task CleanupExpiredImagesAsync(CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var cloudStorage = scope.ServiceProvider.GetRequiredService<ICloudStorageService>();
            var now = DateTime.UtcNow;

            var expiredLogs = await db.WeatherLogs
                .Where(x => x.ImageDeletedAtUtc == null
                            && x.ImageExpiresAtUtc != null
                            && x.ImageExpiresAtUtc <= now
                            && (!string.IsNullOrEmpty(x.ImageUrl) || !string.IsNullOrEmpty(x.ImagePublicId)))
                .OrderBy(x => x.ImageExpiresAtUtc)
                .Take(_batchSize)
                .ToListAsync(cancellationToken);

            if (!expiredLogs.Any())
            {
                return;
            }

            var deletedCount = 0;
            foreach (var log in expiredLogs)
            {
                var deleted = await DeleteStoredImageAsync(log, cloudStorage, cancellationToken);
                if (!deleted)
                {
                    continue;
                }

                log.ImageUrl = null;
                log.ImageDeletedAtUtc = now;
                deletedCount++;
            }

            if (deletedCount > 0)
            {
                await db.SaveChangesAsync(cancellationToken);
            }

            _logger.LogInformation(
                "Image retention cleanup processed {DeletedCount}/{TotalCount} expired weather log images.",
                deletedCount,
                expiredLogs.Count);
        }

        private async Task<bool> DeleteStoredImageAsync(
            WeatherLog log,
            ICloudStorageService cloudStorage,
            CancellationToken cancellationToken)
        {
            var provider = log.ImageStorageProvider?.Trim().ToLowerInvariant();

            if (provider == ImageStorageProviders.Cloudinary || LooksLikeCloudinaryUrl(log.ImageUrl))
            {
                var publicId = !string.IsNullOrWhiteSpace(log.ImagePublicId)
                    ? log.ImagePublicId
                    : TryExtractCloudinaryPublicId(log.ImageUrl);

                if (string.IsNullOrWhiteSpace(publicId))
                {
                    _logger.LogWarning(
                        "Cannot delete Cloudinary image for WeatherLog {WeatherLogId}: missing public_id.",
                        log.Id);
                    return false;
                }

                log.ImagePublicId ??= publicId;
                var result = await cloudStorage.DeleteImageAsync(publicId, invalidate: true, cancellationToken);
                if (result.IsSuccess)
                {
                    return true;
                }

                _logger.LogWarning(
                    "Cloudinary delete failed for WeatherLog {WeatherLogId}: {Error}",
                    log.Id,
                    result.ErrorMessage);
                return false;
            }

            if (provider == ImageStorageProviders.Local || LooksLikeLocalRainLogUrl(log.ImageUrl))
            {
                return DeleteLocalImage(log.ImageUrl);
            }

            // Unknown legacy provider: hide the URL after expiry, but keep public_id for audit.
            _logger.LogWarning(
                "WeatherLog {WeatherLogId} has expired image with unknown provider '{Provider}'. Clearing URL only.",
                log.Id,
                log.ImageStorageProvider);
            return true;
        }

        private bool DeleteLocalImage(string? imageUrl)
        {
            var localPath = ResolveLocalRainLogPath(imageUrl);
            if (localPath == null)
            {
                return false;
            }

            if (!File.Exists(localPath))
            {
                return true;
            }

            File.Delete(localPath);
            return true;
        }

        private async Task CleanupOrphanLocalFilesAsync(CancellationToken cancellationToken)
        {
            var rainLogDirectory = GetRainLogDirectory();
            if (!Directory.Exists(rainLogDirectory))
            {
                return;
            }

            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var now = DateTime.UtcNow;
            var activeLocalFileNames = (await db.WeatherLogs
                    .Where(x => x.ImageDeletedAtUtc == null
                                && (x.ImageExpiresAtUtc == null || x.ImageExpiresAtUtc > now)
                                && x.ImageUrl != null
                                && x.ImageUrl.Contains("/images/rain_logs/"))
                    .Select(x => x.ImageUrl!)
                    .ToListAsync(cancellationToken))
                .Select(Path.GetFileName)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var cutoff = DateTime.UtcNow.AddHours(-_retentionHours);
            await Task.Run(() =>
            {
                foreach (var file in Directory.EnumerateFiles(rainLogDirectory))
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    var info = new FileInfo(file);
                    if (info.CreationTimeUtc < cutoff && !activeLocalFileNames.Contains(info.Name))
                    {
                        info.Delete();
                    }
                }
            }, cancellationToken);
        }

        private string? ResolveLocalRainLogPath(string? imageUrl)
        {
            if (string.IsNullOrWhiteSpace(imageUrl))
            {
                return null;
            }

            var path = imageUrl;
            if (Uri.TryCreate(imageUrl, UriKind.Absolute, out var uri))
            {
                path = uri.AbsolutePath;
            }

            path = Uri.UnescapeDataString(path).Replace('\\', '/').TrimStart('/');
            if (!path.StartsWith(RainLogFolder, StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            var root = GetWebRoot();
            var fullPath = Path.GetFullPath(Path.Combine(root, path.Replace('/', Path.DirectorySeparatorChar)));
            var rainLogDirectory = GetRainLogDirectory();
            return fullPath.StartsWith(rainLogDirectory, StringComparison.OrdinalIgnoreCase)
                ? fullPath
                : null;
        }

        private string GetRainLogDirectory()
            => Path.GetFullPath(Path.Combine(GetWebRoot(), "images", "rain_logs"));

        private string GetWebRoot()
            => string.IsNullOrWhiteSpace(_env.WebRootPath)
                ? Path.Combine(_env.ContentRootPath, "wwwroot")
                : _env.WebRootPath;

        private static bool LooksLikeLocalRainLogUrl(string? imageUrl)
            => !string.IsNullOrWhiteSpace(imageUrl)
               && imageUrl.Contains("/images/rain_logs/", StringComparison.OrdinalIgnoreCase);

        private static bool LooksLikeCloudinaryUrl(string? imageUrl)
            => !string.IsNullOrWhiteSpace(imageUrl)
               && imageUrl.Contains("cloudinary.com", StringComparison.OrdinalIgnoreCase);

        private static string? TryExtractCloudinaryPublicId(string? imageUrl)
        {
            if (string.IsNullOrWhiteSpace(imageUrl)
                || !Uri.TryCreate(imageUrl, UriKind.Absolute, out var uri))
            {
                return null;
            }

            var path = Uri.UnescapeDataString(uri.AbsolutePath).Trim('/');
            var uploadIndex = path.IndexOf("/upload/", StringComparison.OrdinalIgnoreCase);
            if (uploadIndex < 0)
            {
                return null;
            }

            var publicPath = path[(uploadIndex + "/upload/".Length)..];
            var segments = publicPath.Split('/', StringSplitOptions.RemoveEmptyEntries).ToList();
            if (segments.Count == 0)
            {
                return null;
            }

            if (segments[0].StartsWith("v", StringComparison.OrdinalIgnoreCase)
                && segments[0].Length > 1
                && segments[0].Skip(1).All(char.IsDigit))
            {
                segments.RemoveAt(0);
            }

            if (segments.Count == 0)
            {
                return null;
            }

            var publicId = string.Join('/', segments);
            var extension = Path.GetExtension(publicId);
            return string.IsNullOrEmpty(extension)
                ? publicId
                : publicId[..^extension.Length];
        }
    }
}
