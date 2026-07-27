import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { ScheduleApprovalsView } from 'src/sections/schedule-approvals/view/schedule-approvals-view';

import { SchoolDirectorGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `อนุมัติตารางสอน - ${CONFIG.appName}` };

export default function Page() {
  return (
    <SchoolDirectorGuard>
      <ScheduleApprovalsView detailBasePath={paths.teacher.scheduleApprovals} />
    </SchoolDirectorGuard>
  );
}
