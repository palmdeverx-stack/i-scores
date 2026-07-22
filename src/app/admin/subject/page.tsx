import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { SubjectListView } from 'src/sections/subject/view/subject-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `รายวิชา - ${CONFIG.appName}` };

export default function Page() {
  return <SubjectListView />;
}
