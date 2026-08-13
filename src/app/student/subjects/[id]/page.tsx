import type { Metadata } from 'next';

import { StudentSubjectDetailView } from 'src/sections/student-dashboard/view/student-subject-detail-view';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  return <StudentSubjectDetailView teacherAssignmentId={id} />;
}
