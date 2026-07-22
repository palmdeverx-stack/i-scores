import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { AssignmentCreateView } from 'src/sections/assignment/view/assignment-create-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `สร้างงาน - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  return <AssignmentCreateView teacherAssignmentId={id} />;
}
