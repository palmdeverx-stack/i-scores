import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { MasterDashboardView } from 'src/sections/master-dashboard/view/master-dashboard-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ผู้ดูแลระบบ - ${CONFIG.appName}` };

export default function Page() {
  return <MasterDashboardView />;
}
