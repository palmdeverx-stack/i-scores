import type { Metadata } from 'next';

import { GradeResultDetailView } from 'src/sections/grade-review/view/grade-result-detail-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <DepartmentPermissionGuard permission="grades.review">
      <GradeResultDetailView teacherAssignmentId={id} />
    </DepartmentPermissionGuard>
  );
}
