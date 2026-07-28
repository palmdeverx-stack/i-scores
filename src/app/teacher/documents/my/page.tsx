import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { MyDocumentListView } from 'src/sections/documents/view/my-document-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `เอกสารของฉัน - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="documents.access">
      <MyDocumentListView detailBasePath={paths.teacher.documents.root} />
    </DepartmentPermissionGuard>
  );
}
