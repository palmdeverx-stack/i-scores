import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { ScheduleBuilderView } from 'src/sections/schedule-builder/view/schedule-builder-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `จัดตารางสอน - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="schedule.manage">
      <ScheduleBuilderView />
    </DepartmentPermissionGuard>
  );
}
