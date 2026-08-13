'use client';

import { useMemo } from 'react';

import { MainLayout } from 'src/layouts/main';
import { studentNavData } from 'src/layouts/nav-config-student';

import { useSystemUiSettings } from 'src/sections/system-ui-settings/use-system-ui-settings';
import { SchoolSubscriptionGuard } from 'src/sections/school-subscription/school-subscription-guard';
import { applyMainExperimentalBadges } from 'src/sections/system-ui-settings/apply-experimental-menu-badges';
import {
  filterMainNav,
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
      applyMainExperimentalBadges(
        filterMainNav(studentNavData, subscriptionQuery.data?.subscription.enabled_features ?? []),
        uiSettingsQuery.data?.experimentalMenuPaths ?? []
      ),
    [
      subscriptionQuery.data?.subscription.enabled_features,
      uiSettingsQuery.data?.experimentalMenuPaths,
    ]
  );

  return (
    <AuthGuard>
      <RoleRedirectGuard currentRole={user?.role} allowedRoles={['student']}>
        <MustChangePasswordGuard mustChangePassword={user?.must_change_password}>
          <AcceptLegalGuard acceptedLegalAt={user?.accepted_legal_at}>
            <MainLayout slotProps={{ nav: { data: navData, mobileBottom: true } }}>
              <SchoolSubscriptionGuard>{children}</SchoolSubscriptionGuard>
            </MainLayout>
          </AcceptLegalGuard>
        </MustChangePasswordGuard>
      </RoleRedirectGuard>
    </AuthGuard>
  );
}
