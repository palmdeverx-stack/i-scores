import type { ReactNode } from 'react';

import { cookies } from 'next/headers';

import { verifyAppToken, ACCESS_TOKEN_COOKIE } from 'src/lib/auth-token';

import { EkruAppSystemLayout } from 'src/sections/ekru-app/view/ekru-app-system-layout';

// ----------------------------------------------------------------------

type Props = {
  children: ReactNode;
};

export default async function Layout({ children }: Props) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const caller = token ? verifyAppToken(token) : null;

  if (!caller || caller.role === 'marketplace_user') return children;

  return <EkruAppSystemLayout role={caller.role}>{children}</EkruAppSystemLayout>;
}
