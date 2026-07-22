import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { StudentProfileView } from 'src/sections/student-profile/view/student-profile-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `โปรไฟล์ของฉัน - ${CONFIG.appName}` };

export default function Page() {
  return <StudentProfileView />;
}
