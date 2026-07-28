import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { getSchoolDocumentTemplate } from 'src/sections/documents/document-catalog';
import { DocumentDetailView } from 'src/sections/documents/view/document-detail-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `เอกสาร ปพ.5 - ${CONFIG.appName}` };

type Props = { searchParams: Promise<{ preview?: string }> };

export default async function Page({ searchParams }: Props) {
  const query = await searchParams;
  const template = getSchoolDocumentTemplate('pp5')!;
  return (
    <DepartmentPermissionGuard permission="documents.access">
      <DocumentDetailView
        template={template}
        initialPreview={query.preview === '1'}
        backPath={paths.admin.documents.templates}
      />
    </DepartmentPermissionGuard>
  );
}
