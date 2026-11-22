import type { Metadata } from 'next';

import { SalesSellersView } from 'src/sections/sales-documents/sales-sellers-view';

export const metadata: Metadata = { title: 'ลูกค้า | E-KRU' };

export default function Page() {
  return <SalesSellersView party="customer" />;
}
