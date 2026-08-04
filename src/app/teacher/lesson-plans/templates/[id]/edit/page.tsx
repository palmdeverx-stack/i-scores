import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';
import { TemplateFormView } from 'src/features/templates/view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export const metadata: Metadata = { title: `แก้ไข Template - ${CONFIG.appName}` };

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  return (
    <DepartmentPermissionGuard permission="teaching.assignments">
      <TemplateFormView templateId={(await params).id} />
    </DepartmentPermissionGuard>
  );
}
