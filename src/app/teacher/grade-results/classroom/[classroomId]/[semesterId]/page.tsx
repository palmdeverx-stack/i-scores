import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { GradeResultClassroomView } from 'src/sections/grade-review/view/grade-result-classroom-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ผลการเรียนรายชั้นเรียน - ${CONFIG.appName}` };

type Props = { params: Promise<{ classroomId: string; semesterId: string }> };

export default async function Page({ params }: Props) {
  const { classroomId, semesterId } = await params;
  return (
    <DepartmentPermissionGuard permission="grades.review">
      <GradeResultClassroomView
        classroomId={classroomId}
        semesterId={semesterId}
        detailBasePath={paths.teacher.gradeResults}
        summaryPath={paths.teacher.gradeResults}
      />
    </DepartmentPermissionGuard>
  );
}
