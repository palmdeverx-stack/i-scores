import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { AdminDashboardView } from 'src/sections/admin-dashboard/view/admin-dashboard-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `แดชบอร์ด - ${CONFIG.appName}` };

export default function Page() {
  return <AdminDashboardView />;
}
