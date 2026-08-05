import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { SubjectListView } from 'src/sections/subject/view/subject-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `คลังรายวิชา - ${CONFIG.appName}` };

export default function Page() {
  return <SubjectListView basePath={paths.teacher.subjectRoot} />;
}
