'use client';

import { useMemo } from 'react';

import { DashboardLayout } from 'src/layouts/dashboard';
import { navData as masterNavData } from 'src/layouts/nav-config-master';

import { useSystemUiSettings } from 'src/sections/system-ui-settings/use-system-ui-settings';
import { applyDashboardExperimentalBadges } from 'src/sections/system-ui-settings/apply-experimental-menu-badges';

import { useAuthContext } from 'src/auth/hooks';
import {
  AuthGuard,
  AcceptLegalGuard,
  RoleRedirectGuard,
  MustChangePasswordGuard,
} from 'src/auth/guard';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  const { user } = useAuthContext();
  const uiSettingsQuery = useSystemUiSettings(Boolean(user));
  const navData = useMemo(
    () =>
      applyDashboardExperimentalBadges(
        masterNavData,
        uiSettingsQuery.data?.experimentalMenuPaths ?? []
      ),
    [uiSettingsQuery.data?.experimentalMenuPaths]
  );

  return (
    <AuthGuard>
      <RoleRedirectGuard currentRole={user?.role} allowedRoles={['master_admin']}>
        <MustChangePasswordGuard mustChangePassword={user?.must_change_password}>
          <AcceptLegalGuard acceptedLegalAt={user?.accepted_legal_at}>
            <DashboardLayout slotProps={{ nav: { data: navData } }}>{children}</DashboardLayout>
          </AcceptLegalGuard>
        </MustChangePasswordGuard>
      </RoleRedirectGuard>
    </AuthGuard>
  );
}
