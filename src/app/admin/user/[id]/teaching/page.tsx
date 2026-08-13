import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { TeacherTeachingOverviewView } from 'src/sections/teacher-dashboard/view/teacher-teaching-overview-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <DepartmentPermissionGuard permission="staff.manage">
      <TeacherTeachingOverviewView teacherId={id} backHref={paths.admin.user.root} />
    </DepartmentPermissionGuard>
  );
}
