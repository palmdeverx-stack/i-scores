import type { Metadata } from 'next';

import { AttendanceScanSessionView } from 'src/sections/attendance-scan/view/attendance-scan-session-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export const metadata: Metadata = {};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <DepartmentPermissionGuard permission="teaching.attendance" access="manage">
      <AttendanceScanSessionView sessionId={id} />
    </DepartmentPermissionGuard>
  );
}
