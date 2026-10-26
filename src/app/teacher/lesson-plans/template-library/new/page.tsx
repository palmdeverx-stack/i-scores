import { paths } from 'src/routes/paths';

import { TemplateFormView } from 'src/features/templates/view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="teaching.assignments" access="manage">
      <TemplateFormView
        returnPath={paths.teacher.lessonPlans.templateLibrary}
        draftStorageKey="lesson-template-library-create-draft-v1"
      />
    </DepartmentPermissionGuard>
  );
}
