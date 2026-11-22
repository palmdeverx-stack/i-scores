import type { Metadata } from 'next';

import { SalesDocumentsView } from 'src/sections/sales-documents/sales-documents-view';

export const metadata: Metadata = { title: 'เอกสารการขาย | E-KRU' };

export default function Page() {
  return <SalesDocumentsView />;
}
