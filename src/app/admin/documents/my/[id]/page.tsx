import { DocumentEditorView } from 'src/sections/documents/view/document-editor-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <DepartmentPermissionGuard permission="documents.access">
      <DocumentEditorView id={id} />
    </DepartmentPermissionGuard>
  );
}
