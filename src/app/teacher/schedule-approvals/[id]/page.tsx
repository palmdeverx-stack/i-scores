import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { ScheduleApprovalDetailView } from 'src/sections/schedule-approvals/view/schedule-approval-detail-view';

import { SchoolDirectorGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <SchoolDirectorGuard>
      <ScheduleApprovalDetailView
        approvalId={id}
        backPath={paths.teacher.scheduleApprovals}
      />
    </SchoolDirectorGuard>
  );
}
