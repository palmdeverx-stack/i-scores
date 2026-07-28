import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { EmploymentStatusListView } from 'src/sections/staff-master/view/employment-status-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `สถานะปฏิบัติงาน - ${CONFIG.appName}` };

export default function Page() {
  return <EmploymentStatusListView />;
}
