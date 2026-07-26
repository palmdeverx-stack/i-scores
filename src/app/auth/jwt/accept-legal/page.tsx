import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';
import { getLegalDocument } from 'src/lib/legal-documents';

import { JwtAcceptLegalView } from 'src/auth/view/jwt';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ยอมรับข้อกำหนดการใช้บริการ - ${CONFIG.appName}` };

export default async function Page() {
  const [termsOfService, privacyPolicy] = await Promise.all([
    getLegalDocument('terms-of-service'),
    getLegalDocument('privacy-policy'),
  ]);

  return <JwtAcceptLegalView termsOfService={termsOfService} privacyPolicy={privacyPolicy} />;
}
