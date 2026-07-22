import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { TeacherAssignmentListView } from 'src/sections/teacher-assignment/view/teacher-assignment-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `วิชาที่สอน - ${CONFIG.appName}` };

export default function Page() {
  return <TeacherAssignmentListView />;
}
