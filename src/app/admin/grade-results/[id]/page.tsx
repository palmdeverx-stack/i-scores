import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { GradeResultDetailView } from 'src/sections/grade-review/view/grade-result-detail-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ใบ ปพ.5 - ${CONFIG.appName}` };

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <DepartmentPermissionGuard permission="grades.review">
      <GradeResultDetailView teacherAssignmentId={id} />
    </DepartmentPermissionGuard>
  );
}
