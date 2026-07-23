import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { TeacherStudentsView } from 'src/sections/teacher-students/view/teacher-students-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `นักเรียนของฉัน - ${CONFIG.appName}` };

export default function Page() {
  return <TeacherStudentsView />;
}
