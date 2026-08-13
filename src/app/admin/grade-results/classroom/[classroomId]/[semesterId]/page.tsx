import type { Metadata } from 'next';

import { GradeResultClassroomView } from 'src/sections/grade-review/view/grade-result-classroom-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

type Props = { params: Promise<{ classroomId: string; semesterId: string }> };

export default async function Page({ params }: Props) {
  const { classroomId, semesterId } = await params;
  return (
    <DepartmentPermissionGuard permission="grades.review">
      <GradeResultClassroomView classroomId={classroomId} semesterId={semesterId} />
    </DepartmentPermissionGuard>
  );
}
