import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { GradeReviewGradeSummaryView } from 'src/sections/grade-review/view/grade-review-grade-summary-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="grades.approve">
      <GradeReviewGradeSummaryView gradeBasePath={paths.teacher.gradeReviews} />
    </DepartmentPermissionGuard>
  );
}
