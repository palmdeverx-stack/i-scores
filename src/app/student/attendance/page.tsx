import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { StudentAttendanceView } from 'src/sections/attendance/view/student-attendance-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ประวัติการเข้าเรียน - ${CONFIG.appName}` };

export default function Page() {
  return <StudentAttendanceView />;
}
