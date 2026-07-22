import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { ClassroomCreateView } from 'src/sections/classroom/view/classroom-create-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `เพิ่มห้องเรียน - ${CONFIG.appName}` };

export default function Page() {
  return <ClassroomCreateView />;
}
