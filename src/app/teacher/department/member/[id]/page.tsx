import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { TeacherTeachingOverviewView } from 'src/sections/teacher-dashboard/view/teacher-teaching-overview-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ข้อมูลการสอน - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  return <TeacherTeachingOverviewView teacherId={id} backHref={paths.teacher.department} />;
}
