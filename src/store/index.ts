export type RootState = {
  // Add feature states here, for example: auth: AuthState
  initialized: boolean;
};

export const initialRootState: RootState = {
  initialized: true,
};
