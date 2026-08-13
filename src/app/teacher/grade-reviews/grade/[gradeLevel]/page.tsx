import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { GradeReviewListView } from 'src/sections/grade-review/view/grade-review-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

type Props = { params: Promise<{ gradeLevel: string }> };

function decodeGradeLevel(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function Page({ params }: Props) {
  const { gradeLevel } = await params;
  return (
    <DepartmentPermissionGuard permission="grades.approve">
      <GradeReviewListView
        gradeLevel={decodeGradeLevel(gradeLevel)}
        detailBasePath={paths.teacher.gradeReviews}
        summaryPath={paths.teacher.gradeReviews}
      />
    </DepartmentPermissionGuard>
  );
}
