import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { JwtChangePasswordView } from 'src/auth/view/jwt';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ตั้งรหัสผ่านใหม่ - ${CONFIG.appName}` };

export default function Page() {
  return <JwtChangePasswordView />;
}
