import type { Metadata } from 'next';

import { TimetableView } from 'src/sections/timetable/view/timetable-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="teaching.timetable">
      <TimetableView />
    </DepartmentPermissionGuard>
  );
}
