import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { SubjectListView } from 'src/sections/subject/view/subject-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `รายวิชา - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="subjects.manage">
      <SubjectListView basePath={paths.teacher.departmentSubject} />
    </DepartmentPermissionGuard>
  );
}
