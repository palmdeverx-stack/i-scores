import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { StudentSubjectDetailView } from 'src/sections/student-dashboard/view/student-subject-detail-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `รายละเอียดวิชา - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  return <StudentSubjectDetailView teacherAssignmentId={id} />;
}
