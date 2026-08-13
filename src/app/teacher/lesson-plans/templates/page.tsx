import type { Metadata } from 'next';

import { LessonPlanFullTemplateListView } from 'src/sections/lesson-plan/view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="teaching.assignments">
      <LessonPlanFullTemplateListView />
    </DepartmentPermissionGuard>
  );
}
