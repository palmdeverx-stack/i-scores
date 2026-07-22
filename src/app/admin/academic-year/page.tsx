import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { AcademicYearListView } from 'src/sections/academic-year/view/academic-year-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ปีการศึกษา - ${CONFIG.appName}` };

export default function Page() {
  return <AcademicYearListView />;
}
