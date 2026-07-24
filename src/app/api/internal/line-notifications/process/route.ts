import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { processPendingLineNotifications } from 'src/lib/line-notifications';

// ----------------------------------------------------------------------

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
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
