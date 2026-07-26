import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { ClassroomListView } from 'src/sections/classroom/view/classroom-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ห้องเรียน - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="classrooms.manage">
      <ClassroomListView />
    </DepartmentPermissionGuard>
  );
}
