'use client';

import type { ReactNode } from 'react';
import type { SchoolFeatureKey } from 'src/lib/school-subscription-config';

import { useMemo } from 'react';

import { MainLayout } from 'src/layouts/main';
import { studentNavData } from 'src/layouts/nav-config-student';
import { navData as masterNavData } from 'src/layouts/nav-config-master';
import { navData as teacherNavData } from 'src/layouts/nav-config-teacher';
import { navData as adminNavData } from 'src/layouts/nav-config-dashboard';
import { DashboardLayout, SchoolHeaderIdentity } from 'src/layouts/dashboard';

import { useSystemUiSettings } from 'src/sections/system-ui-settings/use-system-ui-settings';
import {
  filterMainNav,
  filterDashboardNav,
  useSchoolSubscription,
} from 'src/sections/school-subscription/use-school-subscription';
import {
  applyMainExperimentalBadges,
  applyDashboardExperimentalBadges,
} from 'src/sections/system-ui-settings/apply-experimental-menu-badges';
import {
  dedupeTeacherNav,
  filterNavByDepartment,
  groupPersonalWorkspaceNav,
} from 'src/sections/teacher-department/filter-nav-by-department';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

type AppRole = 'master_admin' | 'school_admin' | 'teacher' | 'student';

type Props = {
  role: AppRole;
  children: ReactNode;
};

const EMPTY_FEATURES: SchoolFeatureKey[] = [];
const EMPTY_PATHS: string[] = [];

export function EkruAppSystemLayout({ role, children }: Props) {
  const { user } = useAuthContext();
  const subscriptionQuery = useSchoolSubscription(user?.school_id);
  const uiSettingsQuery = useSystemUiSettings(Boolean(user));
  const enabledFeatures = subscriptionQuery.data?.subscription.enabled_features ?? EMPTY_FEATURES;
  const experimentalMenuPaths = uiSettingsQuery.data?.experimentalMenuPaths ?? EMPTY_PATHS;

  const dashboardNavData = useMemo(() => {
    if (role === 'master_admin') {
      return applyDashboardExperimentalBadges(masterNavData, experimentalMenuPaths);
    }

    if (role === 'school_admin') {
      return applyDashboardExperimentalBadges(
        filterDashboardNav(adminNavData, enabledFeatures),
        experimentalMenuPaths
      );
    }

    const workspaceNav = user?.is_personal_workspace
      ? teacherNavData.map((group) => ({
          ...group,
          subheader: group.subheader === 'ภาพรวม' ? 'พื้นที่ส่วนตัว' : group.subheader,
          items: group.items.filter((item) => item.title !== 'ตรวจแผนการสอน'),
        }))
      : teacherNavData;
    const navWithExperimentalBadges = applyDashboardExperimentalBadges(
      filterDashboardNav(workspaceNav, enabledFeatures),
      experimentalMenuPaths
    );

    if (user?.is_personal_workspace) {
      return groupPersonalWorkspaceNav(dedupeTeacherNav(navWithExperimentalBadges));
    }

    return dedupeTeacherNav(
      filterNavByDepartment(
        navWithExperimentalBadges,
        user?.departments ?? [],
        user?.department_permissions ?? [],
        Boolean(user?.is_school_director)
      )
    );
  }, [
    enabledFeatures,
    experimentalMenuPaths,
    role,
    user?.departments,
    user?.department_permissions,
    user?.is_personal_workspace,
    user?.is_school_director,
  ]);

  const studentNavigation = useMemo(
    () =>
      applyMainExperimentalBadges(
        filterMainNav(studentNavData, enabledFeatures),
        experimentalMenuPaths
      ),
    [enabledFeatures, experimentalMenuPaths]
  );

  if (role === 'student') {
    return (
      <MainLayout slotProps={{ nav: { data: studentNavigation, mobileBottom: true } }}>
        {children}
      </MainLayout>
    );
  }

  if (role === 'teacher') {
    return (
      <DashboardLayout
        tabletHorizontalNav
        tabletQuery="sm"
        cssVars={{
          '--layout-nav-bg': '#FFFFFF',
          '--layout-nav-horizontal-bg': '#FFFFFF',
        }}
        slotProps={{
          nav: {
            data: dashboardNavData,
            headerIdentity: <SchoolHeaderIdentity />,
            mobileBottom: true,
          },
          header: { sx: { bgcolor: '#FFFFFF', color: 'grey.900' } },
        }}
      >
        {children}
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout slotProps={{ nav: { data: dashboardNavData } }}>{children}</DashboardLayout>
  );
}
