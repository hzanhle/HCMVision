# Traffic Camera Data Compliance Notes

This project uses public HCMC traffic camera imagery for local demo, research, and non-commercial learning. This document is a technical compliance reminder, not legal advice.

## Current Local Demo Policy

- Source attribution: traffic camera imagery is from the HCMC traffic portal: https://giaothong.hochiminhcity.gov.vn/map.aspx
- Do not add OCR, license plate reading, face recognition, person/vehicle identification, or tracking across time.
- The backend may send raw camera bytes to the configured AI provider in memory, but raw images must not be persisted.
- Stored rain log images must be redacted copies: resized, lightly blurred/downscaled, and JPEG-compressed.
- Stored rain log images expire after 24 hours. Weather/rain/traffic metadata may remain for statistics after the image URL is cleared.
- Cloudinary images are deleted automatically by the backend cleanup worker using the stored `public_id`. Local fallback files under `wwwroot/images/rain_logs` are also cleaned automatically.

## Scan Strategy Reminder

The current scan settings are intentionally kept for local demo:

```json
"ScanIntervalMinutes": 15,
"MaxCamerasPerScan": 20,
"DailyMaxInferences": 160
```

This is not a production scheduler. With RemoteQwen, 20 cameras per batch and 160 daily inferences means about 8 full batches per day. If the worker is left on continuously, quota can be exhausted quickly.

Do not add on-demand route scanning for user questions unless the data-use policy is reviewed again. Route answers should rely on existing recent logs and must report low data quality when camera coverage is missing or stale.

## Before Production

- Get legal review for public/commercial use and data retention language.
- Replace Colab/ngrok with a production AI runtime or a clear budget-aware model provider.
- Add budget-aware scan scheduling so daily quota is spread across operating hours.
- Add per-camera cooldown/rate-limit guardrails.
- Monitor Cloudinary delete failures and retry counts.
- Add an admin report for expired images that failed deletion.
- Review UI copy to show source attribution and data-quality caveats.

## Useful References

- HCMC traffic portal: https://giaothong.hochiminhcity.gov.vn/map.aspx
- Nghi dinh 47/2020/ND-CP: https://vanban.chinhphu.vn/?docid=199754&pageid=27160
- Nghi dinh 13/2023/ND-CP: https://vanban.chinhphu.vn/?docid=207759&pageid=27160
- Cloudinary Destroy API: https://cloudinary.com/documentation/image_upload_api_reference#destroy
- Cloudinary Admin API delete resources: https://cloudinary.com/documentation/admin_api#delete_resources
