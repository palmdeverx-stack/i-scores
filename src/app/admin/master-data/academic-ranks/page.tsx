import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { AcademicRankListView } from 'src/sections/staff-master/view/academic-rank-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `วิทยฐานะ - ${CONFIG.appName}` };

export default function Page() {
  return <AcademicRankListView />;
}
