import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { GradeReviewGradeSummaryView } from 'src/sections/grade-review/view/grade-review-grade-summary-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ตรวจสอบผลการเรียน - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="grades.approve">
      <GradeReviewGradeSummaryView />
    </DepartmentPermissionGuard>
  );
}
