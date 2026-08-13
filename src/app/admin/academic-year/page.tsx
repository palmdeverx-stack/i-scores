import type { Metadata } from 'next';

import { AcademicYearListView } from 'src/sections/academic-year/view/academic-year-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="academic_years.manage">
      <AcademicYearListView />
    </DepartmentPermissionGuard>
  );
}
