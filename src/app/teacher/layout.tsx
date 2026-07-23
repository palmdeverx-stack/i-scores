'use client';

import { navData as teacherNavData } from 'src/layouts/nav-config-teacher';
import { DashboardLayout, SchoolHeaderIdentity } from 'src/layouts/dashboard';

import { useAuthContext } from 'src/auth/hooks';
import { AuthGuard, RoleRedirectGuard, MustChangePasswordGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  const { user } = useAuthContext();

  return (
    <AuthGuard>
      <RoleRedirectGuard currentRole={user?.role} allowedRoles={['teacher']}>
        <MustChangePasswordGuard mustChangePassword={user?.must_change_password}>
          <DashboardLayout
            tabletHorizontalNav
            tabletQuery="sm"
            cssVars={{
              '--layout-nav-bg': '#FFFFFF',
              '--layout-nav-horizontal-bg': '#FFFFFF',
            }}
            slotProps={{
              nav: {
                data: teacherNavData,
                headerIdentity: <SchoolHeaderIdentity />,
              },
              header: {
                sx: {
                  bgcolor: '#FFFFFF',
                  color: 'grey.900',
                },
              },
            }}
          >
            {children}
          </DashboardLayout>
        </MustChangePasswordGuard>
      </RoleRedirectGuard>
    </AuthGuard>
  );
}
