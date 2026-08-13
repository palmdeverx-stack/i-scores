import type { Metadata } from 'next';

import { ClassroomEnrollmentListView } from 'src/sections/enrollment/view/classroom-enrollment-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return (
    <DepartmentPermissionGuard permission="enrollments.manage">
      <ClassroomEnrollmentListView classroomId={id} />
    </DepartmentPermissionGuard>
  );
}
