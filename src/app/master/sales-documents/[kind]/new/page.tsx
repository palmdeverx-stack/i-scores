import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { SalesDocumentEditorView } from 'src/sections/sales-documents/sales-document-editor-view';
import {
  salesDocumentKind,
  SALES_DOCUMENT_LABELS,
} from 'src/sections/sales-documents/sales-document-schema';

type Props = { params: Promise<{ kind: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const kind = salesDocumentKind.safeParse((await params).kind.replaceAll('-', '_'));
  return {
    title: kind.success
      ? `สร้าง${SALES_DOCUMENT_LABELS[kind.data]} | E-KRU`
      : 'สร้างเอกสารการขาย | E-KRU',
  };
}

export default async function Page({ params }: Props) {
  const kind = salesDocumentKind.safeParse((await params).kind.replaceAll('-', '_'));
  if (!kind.success) notFound();
  return <SalesDocumentEditorView category={kind.data} />;
}
