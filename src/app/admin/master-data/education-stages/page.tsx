import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { EducationStageListView } from 'src/sections/subject-master/view/education-stage-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ช่วงชั้น - ${CONFIG.appName}` };

export default function Page() {
  return <EducationStageListView />;
}
