import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { ClassroomEnrollmentListView } from 'src/sections/enrollment/view/classroom-enrollment-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: `รายชื่อนักเรียนประจำชั้น - ${CONFIG.appName}`,
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <ClassroomEnrollmentListView classroomId={id} />;
}
