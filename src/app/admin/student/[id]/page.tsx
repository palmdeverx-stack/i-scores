import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { StudentDetailView } from 'src/sections/user/view/student-detail-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `รายละเอียดนักเรียน - ${CONFIG.appName}` };

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <DepartmentPermissionGuard permission="students.manage">
      <StudentDetailView studentId={id} basePath={paths.admin.student.root} />
    </DepartmentPermissionGuard>
  );
}
