import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { SubjectListView } from 'src/sections/subject/view/subject-list-view';

// ----------------------------------------------------------------------

export default function Page() {
  return <SubjectListView basePath={paths.teacher.subjectRoot} />;
}
