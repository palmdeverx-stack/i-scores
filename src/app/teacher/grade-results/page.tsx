import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { GradeResultsView } from 'src/sections/grade-review/view/grade-results-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="grades.review">
      <GradeResultsView detailBasePath={paths.teacher.gradeResults} />
    </DepartmentPermissionGuard>
  );
}
