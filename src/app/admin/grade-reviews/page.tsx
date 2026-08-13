import type { Metadata } from 'next';

import { GradeReviewGradeSummaryView } from 'src/sections/grade-review/view/grade-review-grade-summary-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="grades.approve">
      <GradeReviewGradeSummaryView />
    </DepartmentPermissionGuard>
  );
}
