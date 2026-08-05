import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { LessonPlanFormView } from 'src/sections/lesson-plan/view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export const metadata: Metadata = { title: `สร้าง Template - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="teaching.assignments">
      <LessonPlanFormView newCatalogTemplate />
    </DepartmentPermissionGuard>
  );
}
