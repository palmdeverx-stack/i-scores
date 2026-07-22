import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { TeacherProfileView } from 'src/sections/teacher-profile/view/teacher-profile-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `โปรไฟล์ครู - ${CONFIG.appName}` };

export default function Page() {
  return <TeacherProfileView />;
}
