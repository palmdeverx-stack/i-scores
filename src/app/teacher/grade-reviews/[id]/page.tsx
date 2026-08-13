import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { GradeReviewDetailView } from 'src/sections/grade-review/view/grade-review-detail-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <DepartmentPermissionGuard permission="grades.approve">
      <GradeReviewDetailView teacherAssignmentId={id} backPath={paths.teacher.gradeReviews} />
    </DepartmentPermissionGuard>
  );
}
