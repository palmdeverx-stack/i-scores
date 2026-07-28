import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { SubjectTypeListView } from 'src/sections/subject-master/view/subject-type-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ประเภทรายวิชา - ${CONFIG.appName}` };

export default function Page() {
  return <SubjectTypeListView />;
}
