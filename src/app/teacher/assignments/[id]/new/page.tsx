import type { Metadata } from 'next';
import type { AssignmentCategory } from 'src/sections/assignment/assignment-actions';

import { CONFIG } from 'src/global-config';

import { ASSIGNMENT_CATEGORY_META } from 'src/sections/assignment/assignment-actions';
import { AssignmentCreateView } from 'src/sections/assignment/view/assignment-create-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `สร้างงาน - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string; returnTab?: string }>;
};

export default async function Page({ params, searchParams }: Props) {
  const { id } = await params;
  const { category, returnTab } = await searchParams;

  const resolvedCategory = (
    category && category in ASSIGNMENT_CATEGORY_META ? category : undefined
  ) as AssignmentCategory | undefined;

  return (
    <AssignmentCreateView
      teacherAssignmentId={id}
      category={resolvedCategory}
      returnTab={returnTab}
    />
  );
}
