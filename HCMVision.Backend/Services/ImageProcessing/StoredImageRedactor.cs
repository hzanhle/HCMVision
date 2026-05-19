using OpenCvSharp;

namespace HcmcRainVision.Backend.Services.ImageProcessing
{
    public interface IStoredImageRedactor
    {
        byte[]? RedactForStorage(byte[] rawImageBytes);
    }

    public class StoredImageRedactor : IStoredImageRedactor
    {
        private const int DefaultMaxWidth = 720;
        private const int DefaultJpegQuality = 70;
        private const int DefaultBlurKernel = 5;

        private readonly ILogger<StoredImageRedactor> _logger;
        private readonly int _maxWidth;
        private readonly int _jpegQuality;
        private readonly int _blurKernel;

        public StoredImageRedactor(IConfiguration configuration, ILogger<StoredImageRedactor> logger)
        {
            _logger = logger;
            _maxWidth = Math.Clamp(
                configuration.GetValue("ImageRetention:RedactedStoredImageMaxWidth", DefaultMaxWidth),
                320,
                1280);
            _jpegQuality = Math.Clamp(
                configuration.GetValue("ImageRetention:RedactedStoredImageJpegQuality", DefaultJpegQuality),
                40,
                90);

            var configuredKernel = configuration.GetValue("ImageRetention:RedactedStoredImageBlurKernel", DefaultBlurKernel);
            _blurKernel = Math.Clamp(configuredKernel, 1, 15);
            if (_blurKernel % 2 == 0)
            {
                _blurKernel++;
            }
        }

        public byte[]? RedactForStorage(byte[] rawImageBytes)
        {
            try
            {
                using var source = Cv2.ImDecode(rawImageBytes, ImreadModes.Color);
                if (source.Empty())
                {
                    _logger.LogWarning("Stored image redaction failed: OpenCV could not decode image bytes.");
                    return null;
                }

                using var resized = ResizeIfNeeded(source);
                using var blurred = new Mat();
                Cv2.GaussianBlur(resized, blurred, new Size(_blurKernel, _blurKernel), 0);

                Cv2.ImEncode(
                    ".jpg",
                    blurred,
                    out var encoded,
                    new[] { new ImageEncodingParam(ImwriteFlags.JpegQuality, _jpegQuality) });

                return encoded;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Stored image redaction failed. Raw image will not be persisted.");
                return null;
            }
        }

        private Mat ResizeIfNeeded(Mat source)
        {
            if (source.Width <= _maxWidth)
            {
                return source.Clone();
            }

            var scale = (double)_maxWidth / source.Width;
            var targetSize = new Size(_maxWidth, Math.Max(1, (int)Math.Round(source.Height * scale)));
            var resized = new Mat();
            Cv2.Resize(source, resized, targetSize, 0, 0, InterpolationFlags.Area);
            return resized;
        }
    }
}
