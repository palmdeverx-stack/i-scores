import type { Metadata } from 'next';

import { EnrollmentOverviewView } from 'src/sections/enrollment/view/enrollment-overview-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="enrollments.manage">
      <EnrollmentOverviewView />
    </DepartmentPermissionGuard>
  );
}
