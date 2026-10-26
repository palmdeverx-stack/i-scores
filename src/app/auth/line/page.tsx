import type { Metadata } from 'next';

import { LineLoginView } from 'src/auth/view/line/line-login-view';

export const metadata: Metadata = {
  title: 'เข้าสู่ระบบด้วย LINE | E-KRU',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};
export default function Page() {
  return <LineLoginView />;
}
