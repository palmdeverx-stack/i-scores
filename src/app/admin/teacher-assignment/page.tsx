import type { Metadata } from 'next';

import { TeacherAssignmentListView } from 'src/sections/teacher-assignment/view/teacher-assignment-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="schedule.manage">
      <TeacherAssignmentListView />
    </DepartmentPermissionGuard>
  );
}
