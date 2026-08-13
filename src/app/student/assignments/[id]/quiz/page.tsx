import type { Metadata } from 'next';

import { StudentQuizView } from 'src/sections/student-dashboard/view/student-quiz-view';

// ----------------------------------------------------------------------

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <StudentQuizView assignmentId={id} />;
}
