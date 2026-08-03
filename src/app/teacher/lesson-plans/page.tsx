import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { LessonPlanListView } from 'src/sections/lesson-plan/view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `แผนการสอน - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="teaching.assignments">
      <LessonPlanListView />
    </DepartmentPermissionGuard>
  );
}
