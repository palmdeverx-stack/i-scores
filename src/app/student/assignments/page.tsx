import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { StudentAssignmentsView } from 'src/sections/student-dashboard/view/student-assignments-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `งานที่ต้องส่ง - ${CONFIG.appName}` };

export default function Page() {
  return <StudentAssignmentsView />;
}
