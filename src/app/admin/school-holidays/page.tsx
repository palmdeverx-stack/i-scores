import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { SchoolHolidaysListView } from 'src/sections/school-holidays/view/school-holidays-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `วันหยุดโรงเรียน - ${CONFIG.appName}` };

export default function Page() {
  return <SchoolHolidaysListView />;
}
