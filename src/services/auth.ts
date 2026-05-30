import { apiRequest, extractData } from './api';

type LoginPayload = {
  username: string;
  password: string;
};

export type RegisterPayload = {
  username: string;
  email: string;
  password: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  token: string;
  newPassword: string;
};

type LoginResponse = {
  token?: string;
  accessToken?: string;
  jwtToken?: string;
  refreshToken?: string;
  user?: UserProfile;
  data?: unknown;
};

export type UserProfile = {
  id?: string;
  username?: string;
  email?: string;
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
};

function pickFirstString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return null;
}

function extractToken(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const target = payload as Record<string, unknown>;
  const directToken = pickFirstString(target, [
    'token',
    'accessToken',
    'jwtToken',
    'jwt',
    'bearerToken',
  ]);

  if (directToken) {
    return directToken;
  }

  if (target.data && typeof target.data === 'object') {
    return pickFirstString(target.data as Record<string, unknown>, [
      'token',
      'accessToken',
      'jwtToken',
      'jwt',
      'bearerToken',
    ]);
  }

  return null;
}

export async function loginRequest(payload: LoginPayload): Promise<{ token: string; profile: UserProfile | null }> {
  const response = await apiRequest<LoginResponse>('/Auth/login', {
    method: 'POST',
    body: payload,
  });

  const token = extractToken(response);
  if (!token) {
    throw new Error('Dang nhap thanh cong nhung khong nhan duoc token tu backend.');
  }

  const me = await getMe(token).catch(() => null);
  return { token, profile: me };
}

export async function getMe(token: string): Promise<UserProfile> {
  const response = await apiRequest<unknown>('/Auth/me', {
    method: 'GET',
    token,
  });

  return extractData<UserProfile>(response);
}

export async function registerRequest(payload: RegisterPayload): Promise<void> {
  await apiRequest<unknown>('/Auth/register', {
    method: 'POST',
    body: payload,
  });
}

export async function forgotPasswordRequest(payload: ForgotPasswordPayload): Promise<void> {
  await apiRequest<unknown>('/Auth/forgot-password', {
    method: 'POST',
    body: payload,
  });
}

export async function resetPasswordRequest(payload: ResetPasswordPayload): Promise<void> {
  await apiRequest<unknown>('/Auth/reset-password', {
    method: 'POST',
    body: payload,
  });
}
