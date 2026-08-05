import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { LessonPlanFullTemplateListView } from 'src/sections/lesson-plan/view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Template แผนการสอน - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="teaching.assignments">
      <LessonPlanFullTemplateListView />
    </DepartmentPermissionGuard>
  );
}
