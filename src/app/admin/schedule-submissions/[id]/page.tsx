import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { ScheduleApprovalDetailView } from 'src/sections/schedule-approvals/view/schedule-approval-detail-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `รายละเอียดการลงนามตารางสอน - ${CONFIG.appName}` };

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <DepartmentPermissionGuard permission="schedule.manage">
      <ScheduleApprovalDetailView
        approvalId={id}
        readOnly
        backPath={paths.admin.scheduleSubmissions}
      />
    </DepartmentPermissionGuard>
  );
}
