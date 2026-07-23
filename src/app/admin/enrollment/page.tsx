import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { EnrollmentOverviewView } from 'src/sections/enrollment/view/enrollment-overview-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ลงทะเบียนนักเรียน - ${CONFIG.appName}` };

export default function Page() {
  return <EnrollmentOverviewView />;
}
