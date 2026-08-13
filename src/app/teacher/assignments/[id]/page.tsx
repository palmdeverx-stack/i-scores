import type { Metadata } from 'next';

import { TeacherAssignmentDetailView } from 'src/sections/teacher-assignment/view/teacher-assignment-detail-view';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  return <TeacherAssignmentDetailView teacherAssignmentId={id} />;
}
