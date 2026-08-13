import type { Metadata } from 'next';

import { ScheduleSubmissionSignView } from 'src/sections/schedule-builder/view/schedule-submission-sign-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

type Props = { params: Promise<{ classroomId: string; semesterId: string }> };

export default async function Page({ params }: Props) {
  const { classroomId, semesterId } = await params;
  return (
    <DepartmentPermissionGuard permission="schedule.manage">
      <ScheduleSubmissionSignView classroomId={classroomId} semesterId={semesterId} />
    </DepartmentPermissionGuard>
  );
}
