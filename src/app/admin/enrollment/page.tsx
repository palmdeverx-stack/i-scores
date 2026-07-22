import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { EnrollmentListView } from 'src/sections/enrollment/view/enrollment-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `การลงทะเบียนนักเรียน - ${CONFIG.appName}` };

export default function Page() {
  return <EnrollmentListView />;
}
