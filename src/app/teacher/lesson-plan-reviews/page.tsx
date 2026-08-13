import type { Metadata } from 'next';

import { LessonPlanReviewListView } from 'src/sections/lesson-plan/view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="lesson_plans.review" schoolWorkspaceOnly>
      <LessonPlanReviewListView />
    </DepartmentPermissionGuard>
  );
}
