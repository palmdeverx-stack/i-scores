import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };

function canAccessSchool(
  caller: { role: string; schoolId: string | null },
  schoolId: string
): boolean {
  return caller.role === 'master_admin' || caller.schoolId === schoolId;
}

export async function GET(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['master_admin', 'school_admin']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;

  if (!canAccessSchool(caller, id)) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { data: school, error } = await supabaseAdmin
    .from('schools')
    .select('id, name, code, logo_url, is_active, created_at')
    .eq('id', id)
    .single();

  if (error || !school) {
    return NextResponse.json({ message: 'ไม่พบโรงเรียนนี้' }, { status: 404 });
  }

  return NextResponse.json({ school });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['master_admin', 'school_admin']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;

  if (!canAccessSchool(caller, id)) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { name, isActive } = await request.json();

  const updates: Record<string, unknown> = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ message: 'กรุณากรอกชื่อโรงเรียน' }, { status: 400 });
    }
    updates.name = name;
  }

  if (isActive !== undefined) {
    if (caller.role !== 'master_admin') {
      return NextResponse.json(
        { message: 'เฉพาะผู้ดูแลระบบเท่านั้นที่เปิด/ปิดการใช้งานโรงเรียนได้' },
        { status: 403 }
      );
    }
    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ message: 'ค่า isActive ต้องเป็น true หรือ false' }, { status: 400 });
    }
    updates.is_active = isActive;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ message: 'ไม่มีข้อมูลให้อัปเดต' }, { status: 400 });
  }

  const { data: school, error } = await supabaseAdmin
    .from('schools')
    .update(updates)
    .eq('id', id)
    .select('id, name, code, logo_url, is_active, created_at')
    .single();

  if (error || !school) {
    return NextResponse.json(
      { message: error?.message ?? 'ไม่สามารถอัปเดตข้อมูลโรงเรียนได้' },
      { status: 500 }
    );
  }

  return NextResponse.json({ school });
}
