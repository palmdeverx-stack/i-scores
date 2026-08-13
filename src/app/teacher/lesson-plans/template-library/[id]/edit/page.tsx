import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';
import { TemplateFormView } from 'src/features/templates/view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <DepartmentPermissionGuard permission="teaching.assignments">
      <TemplateFormView
        templateId={(await params).id}
        returnPath={paths.teacher.lessonPlans.templateLibrary}
      />
    </DepartmentPermissionGuard>
  );
}
