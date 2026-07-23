import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { AttendanceScanSessionView } from 'src/sections/attendance-scan/view/attendance-scan-session-view';

export const metadata: Metadata = {
  title: `กล้องสแกนเช็คชื่อ | ${CONFIG.appName}`,
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <AttendanceScanSessionView sessionId={id} />;
}
