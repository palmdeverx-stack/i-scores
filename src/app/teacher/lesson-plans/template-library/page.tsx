import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { LessonPlanTemplateLibraryView } from 'src/sections/lesson-plan/view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `รวม Template ทุกประเภท - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="teaching.assignments">
      <LessonPlanTemplateLibraryView />
    </DepartmentPermissionGuard>
  );
}
