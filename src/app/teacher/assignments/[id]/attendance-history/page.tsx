import type { Metadata } from 'next';

import { TeacherAssignmentAttendanceHistoryView } from 'src/sections/teacher-assignment/view/teacher-assignment-attendance-history-view';

export const metadata: Metadata = {
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <TeacherAssignmentAttendanceHistoryView teacherAssignmentId={id} />;
}
