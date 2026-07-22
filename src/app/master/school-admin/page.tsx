import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { SchoolAdminListView } from 'src/sections/school-admin/view/school-admin-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ผู้ดูแลโรงเรียน - ${CONFIG.appName}` };

export default function Page() {
  return <SchoolAdminListView />;
}
