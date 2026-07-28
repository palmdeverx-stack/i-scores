import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { StaffCreateView } from 'src/sections/user/view/staff-create-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `แก้ไขครู/บุคลากร - ${CONFIG.appName}` };

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <DepartmentPermissionGuard permission="staff.manage">
      <StaffCreateView userId={id} />
    </DepartmentPermissionGuard>
  );
}
