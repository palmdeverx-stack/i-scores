'use client';

import { useMemo } from 'react';

import { MainLayout } from 'src/layouts/main';
import { studentNavData } from 'src/layouts/nav-config-student';

import { SchoolSubscriptionGuard } from 'src/sections/school-subscription/school-subscription-guard';
import {
  filterMainNav,
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
      filterMainNav(studentNavData, subscriptionQuery.data?.subscription.enabled_features ?? []),
    [subscriptionQuery.data?.subscription.enabled_features]
  );

  return (
    <AuthGuard>
      <RoleRedirectGuard currentRole={user?.role} allowedRoles={['student']}>
        <MustChangePasswordGuard mustChangePassword={user?.must_change_password}>
          <MainLayout slotProps={{ nav: { data: navData, mobileBottom: true } }}>
            <SchoolSubscriptionGuard>{children}</SchoolSubscriptionGuard>
          </MainLayout>
        </MustChangePasswordGuard>
      </RoleRedirectGuard>
    </AuthGuard>
  );
}
