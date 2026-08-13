'use client';

import type { AuthState } from '../../types';

import { useSetState } from 'minimal-shared/hooks';
import { useRef, useMemo, useEffect, useCallback } from 'react';

import { paths } from 'src/routes/paths';

import { AuthContext } from '../auth-context';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

const SESSION_RETRY_DELAY_MS = 300;
const CHECK_FAILED_RETRY_DELAY_MS = 3000;
const MAX_CHECK_FAILED_RETRIES = 5;

async function fetchCurrentSession(): Promise<Response> {
  try {
    return await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
  } catch {
    // A dev-server restart, navigation, or brief network interruption can reject fetch
    // before an HTTP response exists. Retry once instead of surfacing a handled error.
    await new Promise((resolve) => setTimeout(resolve, SESSION_RETRY_DELAY_MS));
    return fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
  }
}

export function AuthProvider({ children }: Props) {
  const { state, setState } = useSetState<AuthState>({
    user: null,
    loading: true,
    checkFailed: false,
  });
  const sessionCheckSequence = useRef(0);
  const failedRetryCount = useRef(0);

  const checkUserSession = useCallback(async (): Promise<void> => {
    const checkSequence = ++sessionCheckSequence.current;

    const retryAfterFailure = () => {
      if (failedRetryCount.current >= MAX_CHECK_FAILED_RETRIES) return;
      failedRetryCount.current += 1;
      setTimeout(() => {
        if (checkSequence === sessionCheckSequence.current) checkUserSession();
      }, CHECK_FAILED_RETRY_DELAY_MS);
    };

    try {
      const response = await fetchCurrentSession();
      if (checkSequence !== sessionCheckSequence.current) return;

      if (!response.ok) {
        if (response.status === 401) {
          // Confirmed by the server: this session is genuinely invalid.
          failedRetryCount.current = 0;
          setState({ user: null, loading: false, checkFailed: false });
          const isAuthPage = window.location.pathname.startsWith('/auth/');
          if (!isAuthPage) {
            const returnTo = `${window.location.pathname}${window.location.search}`;
            window.location.replace(
              `${paths.auth.jwt.signIn}?${new URLSearchParams({ returnTo }).toString()}`
            );
          }
          return;
        }

        // Any other status (503, 500, ...) means the liveness check itself failed — not
        // proof the session is invalid. Keep whatever user we already had and retry
        // instead of bouncing to sign-in.
        setState({ loading: false, checkFailed: true });
        retryAfterFailure();
        return;
      }

      failedRetryCount.current = 0;
      const { user } = await response.json();
      setState({ user, loading: false, checkFailed: false });
    } catch (error) {
      if (checkSequence !== sessionCheckSequence.current) return;
      console.warn('[auth] Session check unavailable', {
        message: error instanceof Error ? error.message : String(error),
      });
      setState({ loading: false, checkFailed: true });
      retryAfterFailure();
    }
  }, [setState]);

  useEffect(() => {
    checkUserSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------------------------------------------------

  const checkAuthenticated = state.user ? 'authenticated' : 'unauthenticated';

  const status = state.loading ? 'loading' : checkAuthenticated;

  const memoizedValue = useMemo(
    () => ({
      user: state.user
        ? {
            ...state.user,
            id: state.user?.id,
            displayName:
              `${state.user?.first_name ?? ''} ${state.user?.last_name ?? ''}`.trim() ||
              state.user?.username,
            role: state.user?.role ?? 'student',
          }
        : null,
      checkUserSession,
      loading: status === 'loading',
      authenticated: status === 'authenticated',
      unauthenticated: status === 'unauthenticated',
      checkFailed: state.checkFailed,
    }),
    [checkUserSession, state.user, state.checkFailed, status]
  );

  return <AuthContext value={memoizedValue}>{children}</AuthContext>;
}
