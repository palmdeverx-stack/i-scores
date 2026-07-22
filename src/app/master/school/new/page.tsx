import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { SchoolCreateView } from 'src/sections/school/view/school-create-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `เพิ่มโรงเรียน - ${CONFIG.appName}` };

export default function Page() {
  return <SchoolCreateView />;
}
