import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { getSchoolDocumentTemplate } from 'src/sections/documents/document-catalog';
import { DocumentDetailView } from 'src/sections/documents/view/document-detail-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export default async function Page({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const template = getSchoolDocumentTemplate(slug);
  if (!template) notFound();
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
