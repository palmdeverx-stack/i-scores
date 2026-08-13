import type { Metadata } from 'next';

import { MyDocumentListView } from 'src/sections/documents/view/my-document-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="documents.access">
      <MyDocumentListView />
    </DepartmentPermissionGuard>
  );
}
