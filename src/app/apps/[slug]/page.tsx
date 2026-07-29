import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import Alert from '@mui/material/Alert';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { resolveEkruAppAccess } from 'src/lib/ekru-app-access';
import { verifyAppToken, ACCESS_TOKEN_COOKIE } from 'src/lib/auth-token';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ workspaceId?: string }>;
};

export default async function Page({ params, searchParams }: Props) {
  const [{ slug }, query, cookieStore] = await Promise.all([params, searchParams, cookies()]);
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const caller = token ? verifyAppToken(token) : null;
  if (!caller) {
    redirect(`${paths.auth.jwt.signIn}?returnTo=${encodeURIComponent(`/apps/${slug}`)}`);
  }

  const result = await resolveEkruAppAccess(caller, { launchPath: `/apps/${slug}` });
  if (!result.allowed || (query.workspaceId && query.workspaceId !== result.access.workspaceId)) {
    redirect(paths.page403);
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Typography component="h1" variant="h3" sx={{ mb: 2 }}>
        {result.access.appName}
      </Typography>
      <Alert severity="success">
        ตรวจสอบ Session, License, Feature และ Workspace แล้ว พร้อมเปิดใช้งานระบบย่อย
      </Alert>
      <Typography sx={{ mt: 2, color: 'text.secondary' }}>
        Workspace: {result.access.workspaceId}
      </Typography>
    </Container>
  );
}
