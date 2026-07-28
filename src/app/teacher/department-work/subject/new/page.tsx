import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { SubjectFormView } from 'src/sections/subject/view/subject-form-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `เพิ่มรายวิชา - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="subjects.manage">
      <SubjectFormView basePath={paths.teacher.departmentSubject} />
    </DepartmentPermissionGuard>
  );
}
