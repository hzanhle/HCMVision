const memoryStorage = new Map<string, string>();
const TOKEN_KEY = 'auth_token';
const ONBOARDING_KEY = 'onboarding_completed';

type AsyncStorageLike = {
  setItem: (key: string, value: string) => Promise<void>;
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
};

let asyncStorage: AsyncStorageLike | null = null;

function getWebStorage() {
  if (typeof globalThis === 'undefined') {
    return null;
  }

  const target = globalThis as { localStorage?: Storage };
  return target.localStorage ?? null;
}

function getAsyncStorage() {
  if (asyncStorage) {
    return asyncStorage;
  }

  try {
    const moduleRef = require('@react-native-async-storage/async-storage') as {
      default?: AsyncStorageLike;
    };
    asyncStorage = moduleRef.default ?? null;
  } catch {
    asyncStorage = null;
  }

  return asyncStorage;
}

export async function setToken(token: string): Promise<void> {
  const storage = getAsyncStorage();
  if (storage) {
    await storage.setItem(TOKEN_KEY, token);
    return;
  }

  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(TOKEN_KEY, token);
    return;
  }

  memoryStorage.set(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  const storage = getAsyncStorage();
  if (storage) {
    return storage.getItem(TOKEN_KEY);
  }

  const webStorage = getWebStorage();
  if (webStorage) {
    return webStorage.getItem(TOKEN_KEY);
  }

  return memoryStorage.get(TOKEN_KEY) ?? null;
}

export async function clearToken(): Promise<void> {
  const storage = getAsyncStorage();
  if (storage) {
    await storage.removeItem(TOKEN_KEY);
    return;
  }

  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.removeItem(TOKEN_KEY);
    return;
  }

  memoryStorage.delete(TOKEN_KEY);
}

export async function setOnboardingCompleted(value: boolean): Promise<void> {
  const normalized = value ? '1' : '0';
  const storage = getAsyncStorage();
  if (storage) {
    await storage.setItem(ONBOARDING_KEY, normalized);
    return;
  }

  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(ONBOARDING_KEY, normalized);
    return;
  }

  memoryStorage.set(ONBOARDING_KEY, normalized);
}

export async function getOnboardingCompleted(): Promise<boolean> {
  const storage = getAsyncStorage();
  if (storage) {
    return (await storage.getItem(ONBOARDING_KEY)) === '1';
  }

  const webStorage = getWebStorage();
  if (webStorage) {
    return webStorage.getItem(ONBOARDING_KEY) === '1';
  }

  return memoryStorage.get(ONBOARDING_KEY) === '1';
}
