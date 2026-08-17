import type { Metadata } from 'next';

import { JwtSignInView } from 'src/auth/view/jwt';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: { absolute: 'EKRU' },
  description:
    'EKRU (อีครู) ระบบบริหารจัดการโรงเรียนสำหรับครู บุคลากร นักเรียน และผู้ดูแลระบบ ครบทั้งการเรียน การสอน และการวัดผล',
};

export default function Page() {
  return <JwtSignInView />;
}
