import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { GradeResultsView } from 'src/sections/grade-review/view/grade-results-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ผลการเรียน - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="grades.review">
      <GradeResultsView />
    </DepartmentPermissionGuard>
  );
}
