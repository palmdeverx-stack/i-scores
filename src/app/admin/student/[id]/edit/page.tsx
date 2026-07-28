import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { StudentFormView } from 'src/sections/user/view/student-form-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `แก้ไขข้อมูลนักเรียน - ${CONFIG.appName}` };

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <DepartmentPermissionGuard permission="students.manage">
      <StudentFormView studentId={id} basePath={paths.admin.student.root} />
    </DepartmentPermissionGuard>
  );
}
