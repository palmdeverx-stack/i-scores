import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { TimetableView } from 'src/sections/timetable/view/timetable-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ตารางสอน - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="teaching.timetable">
      <TimetableView />
    </DepartmentPermissionGuard>
  );
}
