import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { TeacherAnnouncementListView } from 'src/sections/teacher-announcement/view/teacher-announcement-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ประกาศโรงเรียน - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="announcements.manage">
      <TeacherAnnouncementListView mode="admin" />
    </DepartmentPermissionGuard>
  );
}
