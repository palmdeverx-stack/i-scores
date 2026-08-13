import type { Metadata } from 'next';

import { StudentQrView } from 'src/sections/student-qr/view/student-qr-view';

export const metadata: Metadata = {
};

export default function Page() {
  return <StudentQrView />;
}
