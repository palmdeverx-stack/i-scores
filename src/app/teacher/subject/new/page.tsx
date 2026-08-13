import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { SubjectFormView } from 'src/sections/subject/view/subject-form-view';

// ----------------------------------------------------------------------

export default function Page() {
  return <SubjectFormView basePath={paths.teacher.subjectRoot} />;
}
