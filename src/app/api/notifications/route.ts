import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { flushWorkflowNotifications } from 'src/lib/workflow-notifications';

// ----------------------------------------------------------------------

export async function GET(request: Request) {
  const caller = requireRole(request, ['master_admin', 'school_admin', 'teacher', 'student']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  if (caller.schoolId && ['teacher', 'school_admin'].includes(caller.role)) {
    await flushWorkflowNotifications(caller.schoolId).catch(() =>
      console.error('Inbox delivery deferred')
    );
  }
  let listQuery = supabaseAdmin
    .from('notifications')
    .select('id, type, title, body, link, read_at, created_at')
    .eq('user_id', caller.sub)
    .order('created_at', { ascending: false })
    .limit(30);
  let countQuery = supabaseAdmin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', caller.sub)
    .is('read_at', null);
  if (caller.schoolId) {
    listQuery = listQuery.eq('school_id', caller.schoolId);
    countQuery = countQuery.eq('school_id', caller.schoolId);
  }
  const [{ data, error }, unread] = await Promise.all([listQuery, countQuery]);

  if (error || unread.error) {
    return NextResponse.json({ message: 'โหลดการแจ้งเตือนไม่สำเร็จ' }, { status: 500 });
  }

  return NextResponse.json(
    {
      notifications: data,
      unreadCount: unread.count ?? 0,
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
