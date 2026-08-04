import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { GradeLevelListView } from 'src/sections/subject-master/view/grade-level-list-view';

export const metadata: Metadata = { title: `ระดับชั้น - ${CONFIG.appName}` };

export default function Page() {
  return <GradeLevelListView />;
}
