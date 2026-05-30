export type AuthState = {
  isAuthenticated: boolean;
  token: string | null;
};

export const initialAuthState: AuthState = {
  isAuthenticated: false,
  token: null,
};

export function loginSuccess(token: string): AuthState {
  return {
    isAuthenticated: true,
    token,
  };
}

export function logoutSuccess(): AuthState {
  return {
    isAuthenticated: false,
    token: null,
  };
}
