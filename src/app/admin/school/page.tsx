import type { Metadata } from 'next';

import { SchoolProfileView } from 'src/sections/school/view/school-profile-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="school_profile.view">
      <SchoolProfileView />
    </DepartmentPermissionGuard>
  );
}
