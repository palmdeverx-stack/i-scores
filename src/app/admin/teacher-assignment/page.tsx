import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { TeacherAssignmentListView } from 'src/sections/teacher-assignment/view/teacher-assignment-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ครูประจำวิชา - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="schedule.manage">
      <TeacherAssignmentListView />
    </DepartmentPermissionGuard>
  );
}
