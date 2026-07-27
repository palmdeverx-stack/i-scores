import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { processPendingLineNotifications } from 'src/lib/line-notifications';

// ----------------------------------------------------------------------

function isValidCronSecret(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const provided = request.headers.get('authorization') ?? '';
  const expected = cronSecret ? `Bearer ${cronSecret}` : '';

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  return (
    !!cronSecret &&
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

export async function GET(request: Request) {
  if (!isValidCronSecret(request)) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 401 });
  }

  const { data: integrations, error } = await supabaseAdmin
    .from('school_line_integrations')
    .select('school_id')
    .eq('is_enabled', true);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  await Promise.all(
    (integrations ?? []).map((integration) =>
      processPendingLineNotifications(integration.school_id)
    )
  );
  return NextResponse.json({ processedSchools: integrations?.length ?? 0 });
}
