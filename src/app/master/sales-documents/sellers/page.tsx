import type { Metadata } from 'next';

import { SalesSellersView } from 'src/sections/sales-documents/sales-sellers-view';

export const metadata: Metadata = { title: 'ข้อมูลผู้ขาย | E-KRU' };

export default function Page() {
  return <SalesSellersView />;
}
