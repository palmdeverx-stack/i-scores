import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { PrefixListView } from 'src/sections/staff-master/view/prefix-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `คำนำหน้าชื่อ - ${CONFIG.appName}` };

export default function Page() {
  return <PrefixListView />;
}
