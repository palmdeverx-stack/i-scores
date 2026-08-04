import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';
import { TemplateFormView } from 'src/features/templates/view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export const metadata: Metadata = { title: `สร้าง Template - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="teaching.assignments">
      <TemplateFormView />
    </DepartmentPermissionGuard>
  );
}
