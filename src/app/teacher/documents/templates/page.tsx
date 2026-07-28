import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { DocumentListView } from 'src/sections/documents/view/document-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ตัวอย่างเอกสาร - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="documents.access">
      <DocumentListView
        detailBasePath={paths.teacher.documents.root}
        myDocumentsPath={paths.teacher.documents.my}
      />
    </DepartmentPermissionGuard>
  );
}
