import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { StudentSubjectsView } from 'src/sections/student-dashboard/view/student-subjects-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `วิชาเรียน - ${CONFIG.appName}` };

export default function Page() {
  return <StudentSubjectsView />;
}
