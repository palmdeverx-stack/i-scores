import type { Metadata } from 'next';

import { z } from 'zod';
import { notFound } from 'next/navigation';

import { salesDocumentKind } from 'src/sections/sales-documents/sales-document-schema';
import { SalesDocumentEditorView } from 'src/sections/sales-documents/sales-document-editor-view';

export const metadata: Metadata = { title: 'แก้ไขเอกสารการขาย | E-KRU' };

export default async function Page({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  const category = salesDocumentKind.safeParse(kind.replaceAll('-', '_'));
  if (!category.success || !z.uuid().safeParse(id).success) notFound();
  return <SalesDocumentEditorView id={id} category={category.data} />;
}
