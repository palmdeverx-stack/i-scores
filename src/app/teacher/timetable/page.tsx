import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { TimetableView } from 'src/sections/timetable/view/timetable-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ตารางสอน - ${CONFIG.appName}` };

export default function Page() {
  return <TimetableView />;
}
