import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { SubjectCreateView } from 'src/sections/subject/view/subject-create-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `เพิ่มรายวิชา - ${CONFIG.appName}` };

export default function Page() {
  return <SubjectCreateView />;
}
