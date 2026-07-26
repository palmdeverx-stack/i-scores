import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { SemesterView } from 'src/sections/academic-year/view/semester-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ภาคเรียน - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <DepartmentPermissionGuard permission="academic_years.manage">
      <SemesterView academicYearId={id} />
    </DepartmentPermissionGuard>
  );
}
