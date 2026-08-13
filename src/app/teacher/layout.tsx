'use client';

import { useMemo } from 'react';

import Box from '@mui/material/Box';

import { navData as teacherNavData } from 'src/layouts/nav-config-teacher';
import { DashboardLayout, SchoolHeaderIdentity } from 'src/layouts/dashboard';

import { useSystemUiSettings } from 'src/sections/system-ui-settings/use-system-ui-settings';
import { SchoolSubscriptionGuard } from 'src/sections/school-subscription/school-subscription-guard';
import { applyDashboardExperimentalBadges } from 'src/sections/system-ui-settings/apply-experimental-menu-badges';
import { PersonalWorkspaceImportBanner } from 'src/sections/personal-workspace-import/personal-workspace-import-banner';
import {
  filterDashboardNav,
  useSchoolSubscription,
} from 'src/sections/school-subscription/use-school-subscription';
import {
  dedupeTeacherNav,
  filterNavByDepartment,
  groupPersonalWorkspaceNav,
} from 'src/sections/teacher-department/filter-nav-by-department';

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
  const navData = useMemo(() => {
    const workspaceNav = user?.is_personal_workspace
      ? teacherNavData.map((group) => ({
          ...group,
          subheader: group.subheader === 'ภาพรวม' ? 'พื้นที่ส่วนตัว' : group.subheader,
          items: group.items.filter((item) => item.title !== 'ตรวจแผนการสอน'),
        }))
      : teacherNavData;
    const licensedNav = filterDashboardNav(
      workspaceNav,
      subscriptionQuery.data?.subscription.enabled_features ?? []
    );
    const navWithExperimentalBadge = applyDashboardExperimentalBadges(
      licensedNav,
      uiSettingsQuery.data?.experimentalMenuPaths ?? ['/teacher/lesson-plans']
    );
    if (user?.is_personal_workspace) {
      return groupPersonalWorkspaceNav(dedupeTeacherNav(navWithExperimentalBadge));
    }

    return dedupeTeacherNav(
      filterNavByDepartment(
        navWithExperimentalBadge,
        user?.departments ?? [],
        user?.department_permissions ?? [],
        !!user?.is_school_director
      )
    );
  }, [
    subscriptionQuery.data?.subscription.enabled_features,
    uiSettingsQuery.data?.experimentalMenuPaths,
    user?.departments,
    user?.department_permissions,
    user?.is_school_director,
    user?.is_personal_workspace,
  ]);

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
              <SchoolSubscriptionGuard>
                {!user?.is_personal_workspace && (
                  <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2 }}>
                    <PersonalWorkspaceImportBanner />
                  </Box>
                )}
                {children}
              </SchoolSubscriptionGuard>
            </DashboardLayout>
          </AcceptLegalGuard>
        </MustChangePasswordGuard>
      </RoleRedirectGuard>
    </AuthGuard>
  );
}
