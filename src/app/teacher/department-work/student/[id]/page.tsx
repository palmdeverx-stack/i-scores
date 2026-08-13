import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { StudentDetailView } from 'src/sections/user/view/student-detail-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <DepartmentPermissionGuard permission="students.manage">
      <StudentDetailView studentId={id} basePath={paths.teacher.departmentStudent} />
    </DepartmentPermissionGuard>
  );
}
