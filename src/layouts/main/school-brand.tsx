'use client';

import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { Logo } from 'src/components/logo';

import { getSchool } from 'src/sections/school/school-actions';

import { useAuthContext } from 'src/auth/hooks';
import { getHomePathForRole } from 'src/auth/utils/role-home-path';

// ----------------------------------------------------------------------

export function useMainSchoolBrand() {
  const { user } = useAuthContext();
  const isPersonalWorkspace = user?.is_personal_workspace === true;
  const schoolId = typeof user?.school_id === 'string' ? user.school_id : '';
  const schoolQuery = useQuery({
    queryKey: ['nav-school', schoolId],
    queryFn: () => getSchool(schoolId),
    enabled: !!schoolId && !isPersonalWorkspace,
    staleTime: 5 * 60 * 1000,
  });
  const school = schoolQuery.data ?? null;
  const studentWorkspaceName =
    user?.role === 'student' && school?.workspace_type === 'personal'
      ? /^พื้นที่ส่วนตัวของ\s+\S+@\S+\.\S+$/u.test(school.name.trim())
        ? 'พื้นที่ส่วนตัว'
        : school.name
      : null;

  return {
    user,
    school,
    isPersonalWorkspace,
    studentWorkspaceName,
    isLoading: !!schoolId && !isPersonalWorkspace && schoolQuery.isLoading,
  };
}

export function MainSchoolLogo({
  size = 40,
  showWorkspaceName = false,
}: {
  size?: number;
  showWorkspaceName?: boolean;
}) {
  const { user, school, isLoading, isPersonalWorkspace, studentWorkspaceName } =
    useMainSchoolBrand();
  const href = user ? getHomePathForRole(user.role) : '/';

  if (isLoading) {
    return <Skeleton variant="rounded" width={size} height={size} />;
  }

  const logo =
    isPersonalWorkspace || !school?.logo_url ? (
      <Logo href={href} sx={{ width: size, height: size, flexShrink: 0 }} />
    ) : (
      <Link
        component={RouterLink}
        href={href}
        aria-label={studentWorkspaceName ?? school.name}
        underline="none"
        sx={{
          width: size,
          height: size,
          p: 0.25,
          flexShrink: 0,
          display: 'inline-flex',
          overflow: 'hidden',
          alignItems: 'center',
          borderRadius: 1.25,
          justifyContent: 'center',
          bgcolor: 'common.white',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          component="img"
          src={school.logo_url}
          alt=""
          sx={{ width: 1, height: 1, objectFit: 'contain' }}
        />
      </Link>
    );

  if (showWorkspaceName && studentWorkspaceName) {
    return (
      <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
        {logo}
        <Typography
          variant="subtitle2"
          noWrap
          title={studentWorkspaceName}
          sx={{ maxWidth: { xs: 112, sm: 220 } }}
        >
          {studentWorkspaceName}
        </Typography>
      </Box>
    );
  }

  return logo;
}
