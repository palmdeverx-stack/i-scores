import { NextResponse } from 'next/server';

import { isValidCronSecret } from 'src/lib/cron-auth';
import { processAllPendingLineNotifications } from 'src/lib/cron-tasks';

// ----------------------------------------------------------------------

export async function GET(request: Request) {
  if (!isValidCronSecret(request)) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 401 });
  }

  try {
    const result = await processAllPendingLineNotifications();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to process LINE notifications' },
      { status: 500 }
    );
  }
}
