'use client';

import { useMemo } from 'react';

import { DashboardLayout } from 'src/layouts/dashboard';
import { navData as adminNavData } from 'src/layouts/nav-config-dashboard';

import { SchoolSubscriptionGuard } from 'src/sections/school-subscription/school-subscription-guard';
import {
  filterDashboardNav,
  useSchoolSubscription,
} from 'src/sections/school-subscription/use-school-subscription';

import { useAuthContext } from 'src/auth/hooks';
import { AuthGuard, RoleRedirectGuard, MustChangePasswordGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  const { user } = useAuthContext();
  const subscriptionQuery = useSchoolSubscription(user?.school_id);
  const navData = useMemo(
    () =>
      filterDashboardNav(adminNavData, subscriptionQuery.data?.subscription.enabled_features ?? []),
    [subscriptionQuery.data?.subscription.enabled_features]
  );

  return (
    <AuthGuard>
      <RoleRedirectGuard currentRole={user?.role} allowedRoles={['school_admin']}>
        <MustChangePasswordGuard mustChangePassword={user?.must_change_password}>
          <DashboardLayout slotProps={{ nav: { data: navData } }}>
            <SchoolSubscriptionGuard>{children}</SchoolSubscriptionGuard>
          </DashboardLayout>
        </MustChangePasswordGuard>
      </RoleRedirectGuard>
    </AuthGuard>
  );
}
