import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { SchoolListView } from 'src/sections/school/view/school-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `โรงเรียน - ${CONFIG.appName}` };

export default function Page() {
  return <SchoolListView />;
}
