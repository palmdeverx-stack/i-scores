import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { StudentClassroomView } from 'src/sections/student-dashboard/view/student-classroom-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ห้องเรียนของฉัน - ${CONFIG.appName}` };

export default function Page() {
  return <StudentClassroomView />;
}
