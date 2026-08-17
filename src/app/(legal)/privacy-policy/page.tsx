import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';
import { getLegalDocument } from 'src/lib/legal-documents';

import { LegalDocumentView } from 'src/sections/legal';

export const metadata: Metadata = {
  description: 'นโยบายการเก็บรวบรวม ใช้ เปิดเผย และคุ้มครองข้อมูลส่วนบุคคลของ EKRU',
};

export default async function Page() {
  const content = await getLegalDocument('privacy-policy');

  return <LegalDocumentView content={content} />;
}
