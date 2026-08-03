import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { LessonPlanFormView } from 'src/sections/lesson-plan/view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `แก้ไขแผนการสอน - ${CONFIG.appName}` };

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <DepartmentPermissionGuard permission="teaching.assignments">
      <LessonPlanFormView lessonPlanId={id} />
    </DepartmentPermissionGuard>
  );
}
