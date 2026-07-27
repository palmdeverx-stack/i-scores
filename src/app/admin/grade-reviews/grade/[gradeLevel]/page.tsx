import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { GradeReviewListView } from 'src/sections/grade-review/view/grade-review-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `รายวิชาตามชั้นปี - ${CONFIG.appName}` };

type Props = { params: Promise<{ gradeLevel: string }> };

function decodeGradeLevel(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function Page({ params }: Props) {
  const { gradeLevel } = await params;
  return (
    <DepartmentPermissionGuard permission="grades.approve">
      <GradeReviewListView gradeLevel={decodeGradeLevel(gradeLevel)} />
    </DepartmentPermissionGuard>
  );
}
