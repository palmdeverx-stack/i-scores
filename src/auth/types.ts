export type UserType = Record<string, any> | null;

export type AuthState = {
  user: UserType;
  loading: boolean;
  /** The last session check failed to get a confirmed answer (e.g. DB timeout) — not proof the user is logged out. */
  checkFailed: boolean;
};

export type AuthContextValue = {
  user: UserType;
  loading: boolean;
  authenticated: boolean;
  unauthenticated: boolean;
  checkFailed: boolean;
  checkUserSession?: () => Promise<void>;
};
