'use client';

import { useMemo, useEffect } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter, usePathname } from 'src/routes/hooks';

import { DashboardLayout } from 'src/layouts/dashboard';
import { navData as adminNavData } from 'src/layouts/nav-config-dashboard';

import { filterAdminNavForTeacher } from 'src/sections/teacher-department/filter-nav-by-department';
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
  const router = useRouter();
  const pathname = usePathname();
  const isDelegatedTeacher = user?.role === 'teacher';

  const subscriptionQuery = useSchoolSubscription(user?.school_id);
  const navData = useMemo(() => {
    const featureFiltered = filterDashboardNav(
      adminNavData,
      subscriptionQuery.data?.subscription.enabled_features ?? []
    );
    return isDelegatedTeacher
      ? filterAdminNavForTeacher(featureFiltered, user?.department_permissions ?? [])
      : featureFiltered;
  }, [
    subscriptionQuery.data?.subscription.enabled_features,
    isDelegatedTeacher,
    user?.department_permissions,
  ]);

  // A delegated teacher has no admin dashboard (it calls school_admin-only
  // summary APIs) — send them straight to the first page their permissions
  // actually unlock instead. Zero permissions means the RoleRedirectGuard
  // below shouldn't have let them in at all, but bail out safely just in case.
  useEffect(() => {
    if (!isDelegatedTeacher) return;
    const firstPath = navData[0]?.items[0]?.path;
    if (!firstPath || firstPath === '#') {
      router.replace(paths.teacher.root);
      return;
    }
    if (pathname === paths.admin.root) {
      router.replace(firstPath);
    }
  }, [isDelegatedTeacher, navData, pathname, router]);

  return (
    <AuthGuard>
      <RoleRedirectGuard currentRole={user?.role} allowedRoles={['school_admin', 'teacher']}>
        <MustChangePasswordGuard mustChangePassword={user?.must_change_password}>
          <DashboardLayout slotProps={{ nav: { data: navData } }}>
            <SchoolSubscriptionGuard>{children}</SchoolSubscriptionGuard>
          </DashboardLayout>
        </MustChangePasswordGuard>
      </RoleRedirectGuard>
    </AuthGuard>
  );
}
