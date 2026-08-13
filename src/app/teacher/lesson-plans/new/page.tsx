import type { Metadata } from 'next';

import { LessonPlanFormView } from 'src/sections/lesson-plan/view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

type Props = { searchParams: Promise<{ template?: string; catalogTemplate?: string }> };

export default async function Page({ searchParams }: Props) {
  const { template, catalogTemplate } = await searchParams;

  return (
    <DepartmentPermissionGuard permission="teaching.assignments">
      <LessonPlanFormView templateId={template} catalogSourceTemplateId={catalogTemplate} />
    </DepartmentPermissionGuard>
  );
}
