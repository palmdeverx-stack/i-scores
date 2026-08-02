import { NextResponse } from 'next/server';

import { isValidCronSecret } from 'src/lib/cron-auth';
import { runDailyCron, type DailyCronSlot } from 'src/lib/cron-tasks';

// ----------------------------------------------------------------------

const DAILY_CRON_SLOTS: readonly DailyCronSlot[] = ['morning', 'afternoon'];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slot: string }> }
) {
  if (!isValidCronSecret(request)) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 401 });
  }

  const { slot } = await params;
  if (!DAILY_CRON_SLOTS.includes(slot as DailyCronSlot)) {
    return NextResponse.json({ message: 'Unknown daily cron slot' }, { status: 404 });
  }

  const report = await runDailyCron(slot as DailyCronSlot);
  return NextResponse.json(report, { status: report.ok ? 200 : 207 });
}
