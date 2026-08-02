'use client';

import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useTranslate } from 'src/locales';

import { Logo } from 'src/components/logo';

import { getSchool } from 'src/sections/school/school-actions';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

export function SchoolHeaderIdentity() {
  const { t } = useTranslate();
  const { user } = useAuthContext();
  const isPersonalWorkspace = user?.is_personal_workspace === true;
  const schoolId = typeof user?.school_id === 'string' ? user.school_id : '';
  const { data: school, isLoading } = useQuery({
    queryKey: ['nav-school', schoolId],
    queryFn: () => getSchool(schoolId),
    enabled: !!schoolId && !isPersonalWorkspace,
  });

  if (isPersonalWorkspace) {
    return (
      <Box sx={{ gap: 1.25, display: 'flex', minWidth: 0, alignItems: 'center' }}>
        <Logo href={paths.teacher.root} />
        <Stack sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1">eKru</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('brand.educationManagementSystem')}
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <>
        <Skeleton variant="rounded" width={38} height={38} />
        <Skeleton width={150} height={24} sx={{ ml: 1.25 }} />
      </>
    );
  }

  const schoolName = school?.name ?? t('school.mySchool');

  return (
    <Link
      component={RouterLink}
      href={paths.teacher.root}
      underline="none"
      sx={{
        gap: 1.25,
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        color: 'grey.900',
      }}
    >
      <Avatar
        src={school?.logo_url ?? undefined}
        alt={schoolName}
        variant="rounded"
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          fontWeight: 700,
          color: 'primary.main',
          bgcolor: 'primary.lighter',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {schoolName.charAt(0)}
      </Avatar>
      <Typography
        variant="subtitle1"
        sx={{
          maxWidth: { sm: 220, md: 320 },
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
      >
        {schoolName}
      </Typography>
    </Link>
  );
}
