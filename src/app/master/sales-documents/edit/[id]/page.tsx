import type { Metadata } from 'next';

import { z } from 'zod';
import { notFound, redirect } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { salesDocumentKind } from 'src/sections/sales-documents/sales-document-schema';
import { SalesDocumentEditorView } from 'src/sections/sales-documents/sales-document-editor-view';

export const metadata: Metadata = { title: 'แก้ไขเอกสารการขาย | E-KRU' };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string | string[] }>;
}) {
  const [{ id }, { kind }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  const category = salesDocumentKind.safeParse(kind);
  if (category.success) redirect(paths.master.salesDocumentEdit(id, category.data));
  return <SalesDocumentEditorView id={id} />;
}
