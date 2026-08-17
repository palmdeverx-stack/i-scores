import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';
import { getLegalDocument } from 'src/lib/legal-documents';

import { LegalDocumentView } from 'src/sections/legal';

export const metadata: Metadata = {
  description: 'แม่แบบข้อตกลงการให้บริการ EKRU สำหรับสถานศึกษา',
};

export default async function Page() {
  const content = await getLegalDocument('service-agreement');

  return <LegalDocumentView content={content} />;
}
