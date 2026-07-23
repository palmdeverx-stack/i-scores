import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { HomeroomAttendanceHistoryView } from 'src/sections/teacher-students/view/homeroom-attendance-history-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ประวัติการเข้าแถว - ${CONFIG.appName}` };

export default function Page() {
  return <HomeroomAttendanceHistoryView />;
}
