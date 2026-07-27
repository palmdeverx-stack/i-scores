import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { TeacherDepartmentView } from 'src/sections/teacher-department/view/teacher-department-view';

import { DepartmentWorkspaceGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `งานฝ่าย - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentWorkspaceGuard>
      <TeacherDepartmentView />
    </DepartmentWorkspaceGuard>
  );
}
