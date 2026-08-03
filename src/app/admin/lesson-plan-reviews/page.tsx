import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { LessonPlanReviewListView } from 'src/sections/lesson-plan/view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ตรวจแผนการสอน - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="lesson_plans.review">
      <LessonPlanReviewListView />
    </DepartmentPermissionGuard>
  );
}
