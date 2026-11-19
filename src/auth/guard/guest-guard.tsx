'use client';

import { useState, useEffect } from 'react';
import { safeReturnUrl } from 'minimal-shared/utils';

import { paths } from 'src/routes/paths';
import { useRouter, usePathname, useSearchParams } from 'src/routes/hooks';

import { SplashScreen } from 'src/components/loading-screen';

import { useAuthContext } from '../hooks';
import { getHomePathForRole } from '../utils/role-home-path';

// ----------------------------------------------------------------------

type GuestGuardProps = {
  children: React.ReactNode;
};

export function GuestGuard({ children }: GuestGuardProps) {
  const router = useRouter();

  const { user, loading, authenticated } = useAuthContext();

  const [isChecking, setIsChecking] = useState(true);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const pinRole = searchParams.get('pinRole');
  const hasPinChallenge =
    pathname === paths.auth.jwt.signIn &&
    Boolean(searchParams.get('pinChallengeToken')) &&
    (pinRole === 'master_admin' || pinRole === 'school_admin');
  const defaultRedirect = getHomePathForRole(user?.role);
  const redirectUrl = safeReturnUrl(searchParams.get('returnTo'), defaultRedirect);

  const checkPermissions = async (): Promise<void> => {
    if (loading) {
      return;
    }

    if (authenticated && !hasPinChallenge) {
      router.replace(redirectUrl);
      return;
    }

    setIsChecking(false);
  };

  useEffect(() => {
    checkPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, hasPinChallenge, loading]);

  if (isChecking) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
