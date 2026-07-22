'use client';

import { DashboardLayout } from 'src/layouts/dashboard';
import { navData as teacherNavData } from 'src/layouts/nav-config-teacher';

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
          <DashboardLayout slotProps={{ nav: { data: teacherNavData } }}>{children}</DashboardLayout>
        </MustChangePasswordGuard>
      </RoleRedirectGuard>
    </AuthGuard>
  );
}
