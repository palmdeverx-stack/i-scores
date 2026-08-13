import type { Metadata } from 'next';

import { LessonPlanListView } from 'src/sections/lesson-plan/view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="teaching.assignments">
      <LessonPlanListView />
    </DepartmentPermissionGuard>
  );
}
