import type { Metadata } from 'next';

import { redirect } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { salesDocumentKind } from 'src/sections/sales-documents/sales-document-schema';
import { SalesDocumentEditorView } from 'src/sections/sales-documents/sales-document-editor-view';

export const metadata: Metadata = { title: 'สร้างเอกสารการขาย | E-KRU' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string | string[] }>;
}) {
  const kind = salesDocumentKind.safeParse((await searchParams).kind);
  if (kind.success) redirect(paths.master.salesDocumentNew(kind.data));
  return <SalesDocumentEditorView />;
}
