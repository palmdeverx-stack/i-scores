import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { TeacherAssignmentDetailView } from 'src/sections/teacher-assignment/view/teacher-assignment-detail-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `วิชาที่สอน - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  return <TeacherAssignmentDetailView teacherAssignmentId={id} />;
}
