import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { ClassroomListView } from 'src/sections/classroom/view/classroom-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ห้องเรียน - ${CONFIG.appName}` };

export default function Page() {
  return <ClassroomListView />;
}
