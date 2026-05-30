import { apiRequest, extractData } from './api';

export type CameraItem = {
  id?: string;
  name?: string;
  wardId?: string | null;
  wardName?: string | null;
  districtName?: string | null;
  status?: string | null;
  isOnline?: boolean;
};

type CameraListResult = {
  items?: CameraItem[];
  data?: CameraItem[];
  totalCount?: number;
  total?: number;
};

function normalizeList(payload: unknown) {
  if (Array.isArray(payload)) {
    return {
      items: payload as CameraItem[],
      total: payload.length,
    };
  }

  if (payload && typeof payload === 'object') {
    const candidate = payload as CameraListResult;
    const items = candidate.items ?? candidate.data ?? [];
    const total = candidate.totalCount ?? candidate.total ?? items.length;
    return {
      items,
      total,
    };
  }

  return {
    items: [] as CameraItem[],
    total: 0,
  };
}

export async function getCameraList(page = 1, pageSize = 10) {
  const response = await apiRequest<unknown>(`/Camera?page=${page}&pageSize=${pageSize}`, {
    method: 'GET',
  });

  const data = extractData<unknown>(response);
  return normalizeList(data);
}
