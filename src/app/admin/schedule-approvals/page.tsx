import type { Metadata } from 'next';

import { ScheduleApprovalsView } from 'src/sections/schedule-approvals/view/schedule-approvals-view';

import { SchoolDirectorGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <SchoolDirectorGuard>
      <ScheduleApprovalsView />
    </SchoolDirectorGuard>
  );
}
