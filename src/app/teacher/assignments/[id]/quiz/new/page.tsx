import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { QuizCreateView } from 'src/sections/assignment/view/quiz-create-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `สร้างแบบทดสอบ - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTab?: string }>;
};

export default async function Page({ params, searchParams }: Props) {
  const { id } = await params;
  const { returnTab } = await searchParams;

  return <QuizCreateView teacherAssignmentId={id} returnTab={returnTab} />;
}
