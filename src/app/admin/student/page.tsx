import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { UserListView } from 'src/sections/user/view/user-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `นักเรียน - ${CONFIG.appName}` };

export default function Page() {
  return <UserListView mode="student" />;
}
