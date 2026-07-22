import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { TeacherAnnouncementListView } from 'src/sections/teacher-announcement/view/teacher-announcement-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ประกาศถึงนักเรียน - ${CONFIG.appName}` };

export default function Page() {
  return <TeacherAnnouncementListView />;
}
