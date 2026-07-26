import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { TeacherAssignmentDetailView } from 'src/sections/teacher-assignment/view/teacher-assignment-detail-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ครูประจำวิชา - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <DepartmentPermissionGuard permission="schedule.manage">
      <TeacherAssignmentDetailView teacherAssignmentId={id} />
    </DepartmentPermissionGuard>
  );
}
