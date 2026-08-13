import type { Metadata } from 'next';

import { ScheduleBuilderView } from 'src/sections/schedule-builder/view/schedule-builder-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="schedule.manage">
      <ScheduleBuilderView />
    </DepartmentPermissionGuard>
  );
}
