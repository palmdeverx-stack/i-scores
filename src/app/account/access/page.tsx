import type { Metadata } from 'next';

import { AccountAccessView } from 'src/auth/view/account-access-view';

export const metadata: Metadata = {
  title: 'เข้าสู่บัญชีโรงเรียน | E-KRU',
  robots: { index: false, follow: false },
};
export default function Page() {
  return <AccountAccessView />;
}
