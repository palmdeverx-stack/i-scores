import type { Metadata } from 'next';

import { LessonPlanFormView } from 'src/sections/lesson-plan/view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  return (
    <DepartmentPermissionGuard permission="teaching.assignments">
      <LessonPlanFormView catalogTemplateId={(await params).id} />
    </DepartmentPermissionGuard>
  );
}
