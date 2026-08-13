import type { Metadata } from 'next';

import { JwtSignInView } from 'src/auth/view/jwt';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  description:
    'เข้าสู่ระบบ eKru เพื่อบริหารจัดการการศึกษา การเรียน การสอน และการประเมินผลออนไลน์',
};

export default function Page() {
  return <JwtSignInView />;
}
