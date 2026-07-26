import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { GradebookView } from 'src/sections/gradebook/view/gradebook-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `กรอกคะแนน - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ assignmentId: string }>;
};

export default async function Page({ params }: Props) {
  const { assignmentId } = await params;

  return (
    <DepartmentPermissionGuard permission="schedule.manage">
      <GradebookView assignmentId={assignmentId} />
    </DepartmentPermissionGuard>
  );
}
