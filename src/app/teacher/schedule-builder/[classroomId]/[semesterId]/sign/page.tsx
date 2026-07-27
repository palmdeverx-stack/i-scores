import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { ScheduleSubmissionSignView } from 'src/sections/schedule-builder/view/schedule-submission-sign-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ลงนามส่งตารางเรียน - ${CONFIG.appName}` };

type Props = { params: Promise<{ classroomId: string; semesterId: string }> };

export default async function Page({ params }: Props) {
  const { classroomId, semesterId } = await params;
  return (
    <DepartmentPermissionGuard permission="schedule.manage">
      <ScheduleSubmissionSignView classroomId={classroomId} semesterId={semesterId} />
    </DepartmentPermissionGuard>
  );
}
