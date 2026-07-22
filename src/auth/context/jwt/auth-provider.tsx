'use client';

import type { AuthState } from '../../types';

import { useSetState } from 'minimal-shared/hooks';
import { useMemo, useEffect, useCallback } from 'react';

import { AuthContext } from '../auth-context';
import { setSession, isValidToken, getStoredToken } from './utils';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: Props) {
  const { state, setState } = useSetState<AuthState>({ user: null, loading: true });

  const checkUserSession = useCallback(async (): Promise<void> => {
    try {
      const accessToken = getStoredToken();

      if (!accessToken || !isValidToken(accessToken)) {
        setSession(null);
        setState({ user: null, loading: false });
        return;
      }

      setSession(accessToken);

      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        setSession(null);
        setState({ user: null, loading: false });
        return;
      }

      const { user } = await response.json();

      setState({ user: { ...user, accessToken }, loading: false });
    } catch (error) {
      console.error(error);
      setState({ user: null, loading: false });
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
    }),
    [checkUserSession, state.user, status]
  );

  return <AuthContext value={memoizedValue}>{children}</AuthContext>;
}
