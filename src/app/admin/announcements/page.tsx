import type { Metadata } from 'next';

import { TeacherAnnouncementListView } from 'src/sections/teacher-announcement/view/teacher-announcement-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="announcements.manage">
      <TeacherAnnouncementListView mode="admin" />
    </DepartmentPermissionGuard>
  );
}
