import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { StaffMasterListView } from 'src/sections/staff-master/view/staff-master-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ข้อมูลหลักบุคลากร - ${CONFIG.appName}` };

export default function Page() {
  return <StaffMasterListView />;
}
