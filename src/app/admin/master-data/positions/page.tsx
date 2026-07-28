import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { PositionListView } from 'src/sections/staff-master/view/position-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ตำแหน่ง - ${CONFIG.appName}` };

export default function Page() {
  return <PositionListView />;
}
