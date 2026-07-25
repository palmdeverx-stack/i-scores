import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { TeacherDepartmentView } from 'src/sections/teacher-department/view/teacher-department-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `งานฝ่าย - ${CONFIG.appName}` };

export default function Page() {
  return <TeacherDepartmentView />;
}
