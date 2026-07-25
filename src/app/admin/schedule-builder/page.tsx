import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { ScheduleBuilderView } from 'src/sections/schedule-builder/view/schedule-builder-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `จัดตารางสอน - ${CONFIG.appName}` };

export default function Page() {
  return <ScheduleBuilderView />;
}
