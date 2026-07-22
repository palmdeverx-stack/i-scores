import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { SchoolProfileView } from 'src/sections/school/view/school-profile-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ข้อมูลโรงเรียน - ${CONFIG.appName}` };

export default function Page() {
  return <SchoolProfileView />;
}
