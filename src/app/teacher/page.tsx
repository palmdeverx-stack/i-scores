import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { TeacherDashboardView } from 'src/sections/teacher-dashboard/view/teacher-dashboard-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `แดชบอร์ดครู - ${CONFIG.appName}` };

export default function Page() {
  return <TeacherDashboardView />;
}
