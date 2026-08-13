import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { verifyAppToken, ACCESS_TOKEN_COOKIE } from 'src/lib/auth-token';

import { MarketplaceInvitationAcceptView } from 'src/sections/marketplace-invitation/view/marketplace-invitation-accept-view';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const [{ id }, cookieStore] = await Promise.all([params, cookies()]);
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const caller = token ? verifyAppToken(token) : null;
  if (!caller) {
    redirect(
      `${paths.auth.jwt.signIn}?returnTo=${encodeURIComponent(`/account/marketplace-invitations/${id}`)}`
    );
  }
  if (caller.role !== 'teacher' && caller.role !== 'school_admin') {
    redirect(paths.page403);
  }

  return <MarketplaceInvitationAcceptView invitationId={id} />;
}
