using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace HcmcRainVision.Backend.Services.ImageProcessing
{
    public interface ICloudStorageService
    {
        Task<ImageStorageResult?> UploadImageAsync(
            byte[] imageBytes,
            string fileName,
            DateTime storedAtUtc,
            DateTime expiresAtUtc,
            bool isRedacted,
            CancellationToken cancellationToken = default);

        Task<ImageDeletionResult> DeleteImageAsync(
            string publicId,
            bool invalidate = true,
            CancellationToken cancellationToken = default);
    }

    public class CloudStorageService : ICloudStorageService
    {
        private const string RainLogFolder = "hcmc_rain_vision/rain_logs";

        private readonly Cloudinary? _cloudinary;
        private readonly ILogger<CloudStorageService> _logger;
        private readonly bool _isEnabled;

        public CloudStorageService(IConfiguration config, ILogger<CloudStorageService> logger)
        {
            _logger = logger;

            var cloudName = config["CloudinarySettings:CloudName"];
            var apiKey = config["CloudinarySettings:ApiKey"];
            var apiSecret = config["CloudinarySettings:ApiSecret"];

            _isEnabled = !string.IsNullOrEmpty(cloudName)
                         && !string.IsNullOrEmpty(apiKey)
                         && !string.IsNullOrEmpty(apiSecret);

            if (_isEnabled)
            {
                var account = new Account(cloudName, apiKey, apiSecret);
                _cloudinary = new Cloudinary(account);
                _logger.LogInformation("Cloudinary initialized for rain log storage.");
            }
            else
            {
                _logger.LogWarning("Cloudinary is not configured. Rain log images will fall back to local storage.");
            }
        }

        public async Task<ImageStorageResult?> UploadImageAsync(
            byte[] imageBytes,
            string fileName,
            DateTime storedAtUtc,
            DateTime expiresAtUtc,
            bool isRedacted,
            CancellationToken cancellationToken = default)
        {
            if (!_isEnabled || _cloudinary == null)
            {
                _logger.LogWarning("Cloudinary is unavailable, skipping upload.");
                return null;
            }

            try
            {
                using var stream = new MemoryStream(imageBytes);
                var uploadParams = new ImageUploadParams
                {
                    File = new FileDescription(fileName, stream),
                    Folder = RainLogFolder,
                    PublicId = Path.GetFileNameWithoutExtension(fileName),
                    Overwrite = false,
                    UseFilename = true
                };

                var uploadResult = await _cloudinary.UploadAsync(uploadParams);
                if (uploadResult.Error == null && uploadResult.SecureUrl != null)
                {
                    _logger.LogInformation("Uploaded rain log image to Cloudinary: {PublicId}", uploadResult.PublicId);
                    return new ImageStorageResult(
                        uploadResult.SecureUrl.ToString(),
                        ImageStorageProviders.Cloudinary,
                        uploadResult.PublicId,
                        storedAtUtc,
                        expiresAtUtc,
                        isRedacted);
                }

                _logger.LogError("Cloudinary upload failed: {Message}", uploadResult.Error?.Message);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Cloudinary upload failed.");
                return null;
            }
        }

        public async Task<ImageDeletionResult> DeleteImageAsync(
            string publicId,
            bool invalidate = true,
            CancellationToken cancellationToken = default)
        {
            if (!_isEnabled || _cloudinary == null)
            {
                return ImageDeletionResult.Failed("Cloudinary is not configured.");
            }

            if (string.IsNullOrWhiteSpace(publicId))
            {
                return ImageDeletionResult.Failed("Cloudinary public_id is empty.");
            }

            try
            {
                var deletionParams = new DeletionParams(publicId)
                {
                    ResourceType = ResourceType.Image,
                    Invalidate = invalidate
                };

                var deletionResult = await _cloudinary.DestroyAsync(deletionParams);
                var result = deletionResult.Result?.Trim().ToLowerInvariant();

                if (result == "ok")
                {
                    _logger.LogInformation("Deleted Cloudinary rain log image: {PublicId}", publicId);
                    return ImageDeletionResult.Deleted();
                }

                if (result == "not found")
                {
                    _logger.LogInformation("Cloudinary rain log image already missing: {PublicId}", publicId);
                    return ImageDeletionResult.Missing();
                }

                return ImageDeletionResult.Failed(deletionResult.Error?.Message ?? deletionResult.Result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Cloudinary delete failed for {PublicId}", publicId);
                return ImageDeletionResult.Failed(ex.Message);
            }
        }
    }
}
