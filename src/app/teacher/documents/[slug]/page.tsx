import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { getSchoolDocumentTemplate } from 'src/sections/documents/document-catalog';
import { DocumentDetailView } from 'src/sections/documents/view/document-detail-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `รายละเอียดเอกสาร - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export default async function Page({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const template = getSchoolDocumentTemplate(slug);
  if (!template) notFound();
  return (
    <DepartmentPermissionGuard permission="grades.review">
      <DocumentDetailView
        template={template}
        initialPreview={query.preview === '1'}
        backPath={paths.teacher.documents.root}
      />
    </DepartmentPermissionGuard>
  );
}
