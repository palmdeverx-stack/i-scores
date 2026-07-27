import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { ScheduleApprovalDetailView } from 'src/sections/schedule-approvals/view/schedule-approval-detail-view';

import { SchoolDirectorGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ตรวจสอบตารางเรียน - ${CONFIG.appName}` };

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <SchoolDirectorGuard>
      <ScheduleApprovalDetailView approvalId={id} />
    </SchoolDirectorGuard>
  );
}
