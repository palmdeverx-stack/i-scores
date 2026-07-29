import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { SchoolLicenseView } from 'src/sections/school-license/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `License โรงเรียน | ${CONFIG.appName}` };

export default function Page() {
  return <SchoolLicenseView />;
}

