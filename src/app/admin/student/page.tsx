import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { StudentListView } from 'src/sections/user/view/student-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `นักเรียน - ${CONFIG.appName}` };

export default function Page() {
  return <StudentListView />;
}
