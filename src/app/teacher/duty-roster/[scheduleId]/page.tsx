import { DutyGateView } from 'src/sections/duty-roster/view/duty-gate-view';

type PageProps = { params: Promise<{ scheduleId: string }> };

export default async function Page({ params }: PageProps) {
  const { scheduleId } = await params;
  return <DutyGateView scheduleId={scheduleId} />;
}
