import { z } from 'zod';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

export async function POST(request: Request) {
  const caller = requireRole(request, ['master_admin', 'school_admin', 'teacher', 'student']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const parsed = z
    .object({ ids: z.array(z.uuid()).min(1).max(100).optional() })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  const { ids } = parsed.data;

  let query = supabaseAdmin
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', caller.sub)
    .is('read_at', null);
  if (caller.schoolId) query = query.eq('school_id', caller.schoolId);

  if (Array.isArray(ids) && ids.length) {
    query = query.in('id', ids);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
