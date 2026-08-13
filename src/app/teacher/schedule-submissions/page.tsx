import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { ScheduleApprovalsView } from 'src/sections/schedule-approvals/view/schedule-approvals-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="schedule.manage">
      <ScheduleApprovalsView
        tracking
        detailBasePath={paths.teacher.scheduleSubmissions}
      />
    </DepartmentPermissionGuard>
  );
}
