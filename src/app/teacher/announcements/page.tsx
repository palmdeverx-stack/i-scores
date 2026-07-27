import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { TeacherAnnouncementListView } from 'src/sections/teacher-announcement/view/teacher-announcement-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ประกาศถึงนักเรียน - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="teaching.announcements">
      <TeacherAnnouncementListView />
    </DepartmentPermissionGuard>
  );
}
