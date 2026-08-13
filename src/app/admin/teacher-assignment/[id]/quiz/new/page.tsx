import type { Metadata } from 'next';

import { QuizCreateView } from 'src/sections/assignment/view/quiz-create-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTab?: string }>;
};

export default async function Page({ params, searchParams }: Props) {
  const { id } = await params;
  const { returnTab } = await searchParams;

  return (
    <DepartmentPermissionGuard permission="schedule.manage">
      <QuizCreateView teacherAssignmentId={id} returnTab={returnTab} />
    </DepartmentPermissionGuard>
  );
}
