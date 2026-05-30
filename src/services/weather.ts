import { apiRequest, extractData } from './api';

export type LatestWeather = {
  isRaining?: boolean;
  probability?: number;
  rainProbability?: number;
  updatedAt?: string;
};

export type WeatherLogItem = {
  id?: string;
  cameraId?: string;
  cameraName?: string;
  districtName?: string;
  wardName?: string;
  isRaining?: boolean;
  probability?: number;
  createdAt?: string;
  capturedAt?: string;
};

export async function getLatestWeather() {
  const response = await apiRequest<unknown>('/Weather/latest', {
    method: 'GET',
  });

  return extractData<LatestWeather>(response);
}

export async function getRainingCameraCount(minutes = 30) {
  const response = await apiRequest<unknown>(`/Weather/raining-cameras/count?minutes=${minutes}`, {
    method: 'GET',
  });

  const data = extractData<unknown>(response);
  if (typeof data === 'number') {
    return data;
  }

  if (data && typeof data === 'object') {
    const candidate = data as Record<string, unknown>;
    const value = candidate.count ?? candidate.total ?? candidate.value;
    if (typeof value === 'number') {
      return value;
    }
  }

  return 0;
}

export async function getWeatherLogs(minutes = 180, limit = 5, onlyWithImages = false) {
  const response = await apiRequest<unknown>(
    `/Weather/logs?minutes=${minutes}&limit=${limit}&onlyWithImages=${String(onlyWithImages)}`,
    {
      method: 'GET',
    },
  );

  const data = extractData<unknown>(response);
  if (Array.isArray(data)) {
    return data as WeatherLogItem[];
  }

  if (data && typeof data === 'object') {
    const candidate = data as { items?: WeatherLogItem[]; data?: WeatherLogItem[] };
    return candidate.items ?? candidate.data ?? [];
  }

  return [] as WeatherLogItem[];
}
