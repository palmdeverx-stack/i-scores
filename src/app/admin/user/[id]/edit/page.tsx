import { StaffCreateView } from 'src/sections/user/view/staff-create-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <DepartmentPermissionGuard permission="staff.manage" access="manage">
      <StaffCreateView userId={id} />
    </DepartmentPermissionGuard>
  );
}
