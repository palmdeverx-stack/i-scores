'use client';

import { useMemo } from 'react';

import { navData as teacherNavData } from 'src/layouts/nav-config-teacher';
import { DashboardLayout, SchoolHeaderIdentity } from 'src/layouts/dashboard';

import {
  filterNavByDepartment,
} from 'src/sections/teacher-department/filter-nav-by-department';
import { SchoolSubscriptionGuard } from 'src/sections/school-subscription/school-subscription-guard';
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
  const navData = useMemo(
    () => {
      const filtered = filterNavByDepartment(
        filterDashboardNav(
          teacherNavData,
          subscriptionQuery.data?.subscription.enabled_features ?? []
        ),
        user?.departments ?? [],
        user?.department_permissions ?? [],
        !!user?.is_school_director
      );
      return filtered;
    },
    [
      subscriptionQuery.data?.subscription.enabled_features,
      user?.departments,
      user?.department_permissions,
      user?.is_school_director,
    ]
  );

  return (
    <AuthGuard>
      <RoleRedirectGuard currentRole={user?.role} allowedRoles={['teacher']}>
        <MustChangePasswordGuard mustChangePassword={user?.must_change_password}>
          <AcceptLegalGuard acceptedLegalAt={user?.accepted_legal_at}>
            <DashboardLayout
              tabletHorizontalNav
              tabletQuery="sm"
              cssVars={{
                '--layout-nav-bg': '#FFFFFF',
                '--layout-nav-horizontal-bg': '#FFFFFF',
              }}
              slotProps={{
                nav: {
                  data: navData,
                  headerIdentity: <SchoolHeaderIdentity />,
                  mobileBottom: true,
                },
                header: {
                  sx: {
                    bgcolor: '#FFFFFF',
                    color: 'grey.900',
                  },
                },
              }}
            >
              <SchoolSubscriptionGuard>{children}</SchoolSubscriptionGuard>
            </DashboardLayout>
          </AcceptLegalGuard>
        </MustChangePasswordGuard>
      </RoleRedirectGuard>
    </AuthGuard>
  );
}
