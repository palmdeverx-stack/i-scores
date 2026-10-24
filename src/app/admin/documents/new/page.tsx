import { DocumentEditorView } from 'src/sections/documents/view/document-editor-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="documents.access">
      <DocumentEditorView />
    </DepartmentPermissionGuard>
  );
}
