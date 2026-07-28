import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { StaffTypeListView } from 'src/sections/staff-master/view/staff-type-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ประเภทบุคลากร - ${CONFIG.appName}` };

export default function Page() {
  return <StaffTypeListView />;
}
