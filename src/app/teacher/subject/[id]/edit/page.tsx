import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { SubjectFormView } from 'src/sections/subject/view/subject-form-view';

// ----------------------------------------------------------------------

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <SubjectFormView subjectId={id} basePath={paths.teacher.subjectRoot} />
  );
}
