import type { Metadata } from 'next';

import { MarketplaceSsoContinueView } from 'src/auth/view/marketplace-sso-continue-view';

export const metadata: Metadata = {
  title: 'เปิดใช้งาน E-KRU',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';
export default function Page() {
  return <MarketplaceSsoContinueView />;
}
