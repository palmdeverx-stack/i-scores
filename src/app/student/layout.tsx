'use client';

import { MainLayout } from 'src/layouts/main';
import { studentNavData } from 'src/layouts/nav-config-student';

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
      <RoleRedirectGuard currentRole={user?.role} allowedRoles={['student']}>
        <MustChangePasswordGuard mustChangePassword={user?.must_change_password}>
          <MainLayout slotProps={{ nav: { data: studentNavData } }}>{children}</MainLayout>
        </MustChangePasswordGuard>
      </RoleRedirectGuard>
    </AuthGuard>
  );
}
