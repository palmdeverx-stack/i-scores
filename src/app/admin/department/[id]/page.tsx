import type { Metadata } from 'next';

import { DepartmentDetailView } from 'src/sections/department-management/view/department-detail-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <DepartmentPermissionGuard>
      <DepartmentDetailView departmentId={id} />
    </DepartmentPermissionGuard>
  );
}
