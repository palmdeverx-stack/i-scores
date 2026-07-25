import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { DepartmentDetailView } from 'src/sections/department-management/view/department-detail-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `สมาชิกฝ่าย - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  return <DepartmentDetailView departmentId={id} />;
}
