import { z } from 'zod';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

import { NotificationComposeSchema } from 'src/sections/notifications/notification-compose-schema';

const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId)
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ส่งการแจ้งเตือน' }, { status: 403, headers });
  const { data, error } = await supabaseAdmin
    .from('app_users')
    .select('id,first_name,last_name,username')
    .eq('school_id', caller.schoolId)
    .eq('is_active', true)
    .in('role', ['school_admin', 'teacher', 'student'])
    .order('first_name');
  if (error) return NextResponse.json({ message: 'โหลดผู้รับไม่สำเร็จ' }, { status: 500, headers });
  return NextResponse.json(
    {
      recipients: (data ?? []).map((user) => ({
        id: user.id,
        name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username,
      })),
    },
    { headers }
  );
}
export async function POST(request: Request) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId)
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ส่งการแจ้งเตือน' }, { status: 403 });
  const parsed = NotificationComposeSchema.extend({ id: z.uuid() }).safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success)
    return NextResponse.json({ message: 'กรุณาตรวจสอบหัวข้อ ข้อความ และผู้รับ' }, { status: 400 });
  const body = parsed.data;
  const ids = [...new Set(body.recipientIds)];
  const { data: recipients, error } = await supabaseAdmin
    .from('app_users')
    .select('id')
    .eq('school_id', caller.schoolId)
    .eq('is_active', true)
    .in('role', ['school_admin', 'teacher', 'student'])
    .in('id', ids);
  if (error) return NextResponse.json({ message: 'ตรวจสอบผู้รับไม่สำเร็จ' }, { status: 503 });
  if (recipients?.length !== ids.length)
    return NextResponse.json(
      { message: 'พบผู้รับที่ไม่ได้อยู่ในโรงเรียนหรือปิดใช้งานแล้ว' },
      { status: 400 }
    );
  const inserted = await supabaseAdmin.from('notifications').upsert(
    ids.map((id) => ({
      user_id: id,
      school_id: caller.schoolId,
      type: 'internal_message',
      title: body.title,
      body: body.body,
      event_key: `internal:${caller.sub}:${body.id}`,
    })),
    { onConflict: 'user_id,event_key', ignoreDuplicates: true }
  );
  if (inserted.error)
    return NextResponse.json({ message: 'ส่งการแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  return NextResponse.json({ success: true });
}
