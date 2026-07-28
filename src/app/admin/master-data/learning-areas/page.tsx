import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { LearningAreaListView } from 'src/sections/subject-master/view/learning-area-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `กลุ่มสาระการเรียนรู้ - ${CONFIG.appName}` };

export default function Page() {
  return <LearningAreaListView />;
}
