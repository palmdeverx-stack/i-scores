import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { SchoolAdminCreateView } from 'src/sections/school-admin/view/school-admin-create-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `เพิ่มผู้ดูแลโรงเรียน - ${CONFIG.appName}` };

export default function Page() {
  return <SchoolAdminCreateView />;
}
