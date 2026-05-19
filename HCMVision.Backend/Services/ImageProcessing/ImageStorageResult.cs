namespace HcmcRainVision.Backend.Services.ImageProcessing
{
    public static class ImageStorageProviders
    {
        public const string Cloudinary = "cloudinary";
        public const string Local = "local";
    }

    public sealed record ImageStorageResult(
        string Url,
        string Provider,
        string? PublicId,
        DateTime StoredAtUtc,
        DateTime ExpiresAtUtc,
        bool IsRedacted);

    public sealed record ImageDeletionResult(
        bool IsSuccess,
        bool WasMissing,
        string? ErrorMessage = null)
    {
        public static ImageDeletionResult Deleted() => new(true, false);

        public static ImageDeletionResult Missing() => new(true, true);

        public static ImageDeletionResult Failed(string? errorMessage) => new(false, false, errorMessage);
    }
}
