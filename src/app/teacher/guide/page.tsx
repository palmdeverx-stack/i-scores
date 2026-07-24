import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { UserGuideView } from 'src/sections/user-guide/view/user-guide-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `วิธีใช้งานสำหรับครู - ${CONFIG.appName}` };

export default function Page() {
  return <UserGuideView role="teacher" />;
}
