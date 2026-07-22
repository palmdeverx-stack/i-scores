import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { EnrollmentCreateView } from 'src/sections/enrollment/view/enrollment-create-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `เพิ่มนักเรียน - ${CONFIG.appName}` };

export default function Page() {
  return <EnrollmentCreateView />;
}
