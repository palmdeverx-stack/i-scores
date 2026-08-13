import type { Metadata } from 'next';

import { AssignmentCreateView } from 'src/sections/assignment/view/assignment-create-view';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTab?: string }>;
};

export default async function Page({ params, searchParams }: Props) {
  const { id } = await params;
  const { returnTab } = await searchParams;

  return <AssignmentCreateView teacherAssignmentId={id} returnTab={returnTab} />;
}
