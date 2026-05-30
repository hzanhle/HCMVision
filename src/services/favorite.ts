import { apiRequest, extractData } from './api';

export type FavoriteCamera = {
  cameraId: string;
};

function extractCameraId(item: unknown): string | null {
  if (typeof item === 'string' && item.trim()) {
    return item;
  }

  if (item && typeof item === 'object') {
    const obj = item as Record<string, unknown>;
    const candidate = obj.cameraId ?? obj.id;
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }

  return null;
}

export async function getFavorites() {
  const response = await apiRequest<unknown>('/Favorite', {
    method: 'GET',
  });

  const data = extractData<unknown>(response);
  let source: unknown[] = [];

  if (Array.isArray(data)) {
    source = data;
  } else if (data && typeof data === 'object') {
    const payload = data as { items?: unknown[]; data?: unknown[] };
    source = payload.items ?? payload.data ?? [];
  }

  const ids = source
    .map((item) => extractCameraId(item))
    .filter((id): id is string => Boolean(id));

  return new Set(ids);
}

export async function addFavorite(cameraId: string): Promise<void> {
  await apiRequest(`/Favorite/${cameraId}`, {
    method: 'POST',
  });
}

export async function removeFavorite(cameraId: string): Promise<void> {
  await apiRequest(`/Favorite/${cameraId}`, {
    method: 'DELETE',
  });
}
