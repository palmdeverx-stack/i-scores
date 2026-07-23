import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { StudentQrView } from 'src/sections/student-qr/view/student-qr-view';

export const metadata: Metadata = {
  title: `QR เช็คชื่อของฉัน | ${CONFIG.appName}`,
};

export default function Page() {
  return <StudentQrView />;
}
