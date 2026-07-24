import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { StudentTimetableView } from 'src/sections/student-dashboard/view/student-timetable-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ตารางเรียน - ${CONFIG.appName}` };

export default function Page() {
  return <StudentTimetableView />;
}
