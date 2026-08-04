import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { ActivityTypeListView } from 'src/sections/subject-master/view/activity-type-list-view';

export const metadata: Metadata = { title: `ประเภทกิจกรรมพัฒนาผู้เรียน - ${CONFIG.appName}` };

export default function Page() {
  return <ActivityTypeListView />;
}
