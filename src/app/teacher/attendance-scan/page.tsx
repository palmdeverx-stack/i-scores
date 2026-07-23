import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { AttendanceScanStartView } from 'src/sections/attendance-scan/view/attendance-scan-start-view';

export const metadata: Metadata = {
  title: `สแกน QR เช็คชื่อ | ${CONFIG.appName}`,
};

export default function Page() {
  return <AttendanceScanStartView />;
}
