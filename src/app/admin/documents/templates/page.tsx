import type { Metadata } from 'next';

import { DocumentListView } from 'src/sections/documents/view/document-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="documents.access">
      <DocumentListView />
    </DepartmentPermissionGuard>
  );
}
