import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { DocumentListView } from 'src/sections/documents/view/document-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `เอกสาร - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="grades.review">
      <DocumentListView />
    </DepartmentPermissionGuard>
  );
}
