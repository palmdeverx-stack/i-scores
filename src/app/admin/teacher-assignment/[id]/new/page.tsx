import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { AssignmentCreateView } from 'src/sections/assignment/view/assignment-create-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `สร้างงาน - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTab?: string }>;
};

export default async function Page({ params, searchParams }: Props) {
  const { id } = await params;
  const { returnTab } = await searchParams;

  return (
    <DepartmentPermissionGuard permission="schedule.manage">
      <AssignmentCreateView teacherAssignmentId={id} returnTab={returnTab} />
    </DepartmentPermissionGuard>
  );
}
