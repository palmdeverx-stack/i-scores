import type { Metadata } from 'next';

import { AttendanceScanStartView } from 'src/sections/attendance-scan/view/attendance-scan-start-view';

export const metadata: Metadata = {
};

export default function Page() {
  return <AttendanceScanStartView />;
}
