import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { GuardianStudentProfileView } from 'src/sections/guardian-profile/view/guardian-student-profile-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ข้อมูลนักเรียนสำหรับผู้ปกครอง - ${CONFIG.appName}` };

export default function Page() {
  return <GuardianStudentProfileView />;
}
