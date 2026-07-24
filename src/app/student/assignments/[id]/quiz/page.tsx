import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { StudentQuizView } from 'src/sections/student-dashboard/view/student-quiz-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ทำแบบทดสอบ - ${CONFIG.appName}` };

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <StudentQuizView assignmentId={id} />;
}
