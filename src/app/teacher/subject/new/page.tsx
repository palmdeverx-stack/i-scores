import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { SubjectFormView } from 'src/sections/subject/view/subject-form-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `เพิ่มรายวิชา - ${CONFIG.appName}` };

export default function Page() {
  return <SubjectFormView basePath={paths.teacher.subjectRoot} />;
}
