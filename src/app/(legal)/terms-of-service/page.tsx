import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';
import { getLegalDocument } from 'src/lib/legal-documents';

import { LegalDocumentView } from 'src/sections/legal';

export const metadata: Metadata = {
  description: 'ข้อกำหนดและเงื่อนไขสำหรับการเข้าถึงและใช้บริการ EKRU',
};

export default async function Page() {
  const content = await getLegalDocument('terms-of-service');

  return <LegalDocumentView content={content} />;
}
