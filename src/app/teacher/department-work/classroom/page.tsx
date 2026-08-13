import type { Metadata } from 'next';

import { ClassroomListView } from 'src/sections/classroom/view/classroom-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="classrooms.manage">
      <ClassroomListView />
    </DepartmentPermissionGuard>
  );
}
