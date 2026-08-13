import type { Metadata } from 'next';

import { GradebookView } from 'src/sections/gradebook/view/gradebook-view';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ assignmentId: string }>;
};

export default async function Page({ params }: Props) {
  const { assignmentId } = await params;

  return <GradebookView assignmentId={assignmentId} />;
}
