import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { TeacherTeachingOverviewView } from 'src/sections/teacher-dashboard/view/teacher-teaching-overview-view';

import { DepartmentWorkspaceGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <DepartmentWorkspaceGuard>
      <TeacherTeachingOverviewView teacherId={id} backHref={paths.teacher.department} />
    </DepartmentWorkspaceGuard>
  );
}
