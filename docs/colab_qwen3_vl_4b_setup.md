# Qwen3-VL 4B Colab Runtime

This runtime is for local testing only. The local backend sends a camera image to Colab, Colab runs `Qwen/Qwen3-VL-4B-Instruct`, then returns rain and traffic levels.

## Daily Test Flow

1. Open `docs/colab_qwen3_vl_4b_runtime.ipynb` in Google Colab.
2. Select `Runtime` > `Change runtime type` > `T4 GPU`.
3. Run the GPU check cell. If `nvidia-smi` fails, reconnect with GPU before continuing.
4. Set:
   - `API_TOKEN` to a local secret value.
   - `NGROK_AUTHTOKEN` to your ngrok token if your ngrok account requires it.
5. Run install and model-load cells.
6. Run the API cell. Copy the printed ngrok HTTPS URL.
7. Update `HCMVision.Backend/appsettings.Local.json`:

```json
"AI": {
  "Provider": "RemoteQwen",
  "EnableModel": true,
  "MaxParallelism": 1,
  "RemoteQwen": {
    "BaseUrl": "https://your-ngrok-url.ngrok-free.app",
    "ApiToken": "same-token-as-colab",
    "VisionModel": "Qwen/Qwen3-VL-4B-Instruct",
    "TimeoutSeconds": 120,
    "SessionEnabled": true,
    "ScanIntervalMinutes": 15,
    "MaxCamerasPerScan": 20,
    "DailyMaxInferences": 160
  }
}
```

8. Start backend locally and test `/api/Weather/test-ai` with a sample traffic camera image.
9. When done, set `SessionEnabled` back to `false`, stop the backend, then in Colab choose `Runtime` > `Disconnect and delete runtime`.

## Quota Settings

For about 2 hours per day:

- `ScanIntervalMinutes = 15`
- `MaxCamerasPerScan = 20`
- `DailyMaxInferences = 160`
- `MaxParallelism = 1`

This caps the worker to roughly 8 scan cycles per 2-hour session and 160 model calls per day. If T4 latency is high or Colab quota feels tight, lower `MaxCamerasPerScan` to `5` or `10`.

## Backend Contract

Colab `/predict` must return JSON:

```json
{
  "rain_level": "none|light|medium|heavy",
  "traffic_level": "clear|slow|jam|unknown",
  "confidence": 0.0,
  "reason": "short reason",
  "model": "Qwen/Qwen3-VL-4B-Instruct"
}
```

The backend maps `isRaining` from `rain_level != "none"` and stores `rain_level`, `traffic_level`, `ai_model`, and `ai_reason` in `weather_logs`.

## Notes

- Colab resources are not guaranteed, even on Pro. If Colab says no GPU or no compute units, verify the active Google account and try again later.
- T4 should be the first option. Do not use A100/L4 unless T4 is unavailable or too slow.
- Keep the ngrok URL and token in `appsettings.Local.json`; do not commit them.
- Colab is not a production runtime. Use it only for local interactive testing.
