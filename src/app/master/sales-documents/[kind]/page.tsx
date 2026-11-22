import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { SalesDocumentsView } from 'src/sections/sales-documents/sales-documents-view';
import {
  salesDocumentKind,
  SALES_DOCUMENT_LABELS,
} from 'src/sections/sales-documents/sales-document-schema';

type Props = { params: Promise<{ kind: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const kind = salesDocumentKind.safeParse((await params).kind.replaceAll('-', '_'));
  return { title: `${kind.success ? SALES_DOCUMENT_LABELS[kind.data] : 'เอกสารการขาย'} | E-KRU` };
}

export default async function Page({ params }: Props) {
  const kind = salesDocumentKind.safeParse((await params).kind.replaceAll('-', '_'));
  if (!kind.success) notFound();
  return <SalesDocumentsView key={kind.data} category={kind.data} />;
}
