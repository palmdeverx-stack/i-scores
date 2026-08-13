'use client';

import { useMemo } from 'react';

import { DashboardLayout } from 'src/layouts/dashboard';
import { navData as adminNavData } from 'src/layouts/nav-config-dashboard';

import { useSystemUiSettings } from 'src/sections/system-ui-settings/use-system-ui-settings';
import { SchoolSubscriptionGuard } from 'src/sections/school-subscription/school-subscription-guard';
import { applyDashboardExperimentalBadges } from 'src/sections/system-ui-settings/apply-experimental-menu-badges';
import {
  filterDashboardNav,
  useSchoolSubscription,
} from 'src/sections/school-subscription/use-school-subscription';

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

  const subscriptionQuery = useSchoolSubscription(user?.school_id);
  const uiSettingsQuery = useSystemUiSettings(Boolean(user));
  const navData = useMemo(
    () =>
      applyDashboardExperimentalBadges(
        filterDashboardNav(
          adminNavData,
          subscriptionQuery.data?.subscription.enabled_features ?? []
        ),
        uiSettingsQuery.data?.experimentalMenuPaths ?? []
      ),
    [
      subscriptionQuery.data?.subscription.enabled_features,
      uiSettingsQuery.data?.experimentalMenuPaths,
    ]
  );

  return (
    <AuthGuard>
      <RoleRedirectGuard currentRole={user?.role} allowedRoles={['school_admin']}>
        <MustChangePasswordGuard mustChangePassword={user?.must_change_password}>
          <AcceptLegalGuard acceptedLegalAt={user?.accepted_legal_at}>
            <DashboardLayout slotProps={{ nav: { data: navData } }}>
              <SchoolSubscriptionGuard>{children}</SchoolSubscriptionGuard>
            </DashboardLayout>
          </AcceptLegalGuard>
        </MustChangePasswordGuard>
      </RoleRedirectGuard>
    </AuthGuard>
  );
}
