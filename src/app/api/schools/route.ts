import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

async function countFor(table: string, schoolId: string, extraFilter?: Record<string, string>) {
  let query = supabaseAdmin
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('school_id', schoolId);

  if (extraFilter) {
    for (const [key, value] of Object.entries(extraFilter)) {
      query = query.eq(key, value);
    }
  }

  const { count } = await query;
  return count ?? 0;
}

export async function GET(request: Request) {
  const caller = requireRole(request, ['master_admin']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { data: schools, error } = await supabaseAdmin
    .from('schools')
    .select(
      'id, name, code, logo_url, is_active, created_at, subscription:school_subscriptions(plan_name, status, ends_at)'
    )
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const withCounts = await Promise.all(
    schools.map(async (school) => {
      const subscription = Array.isArray(school.subscription)
        ? (school.subscription[0] ?? null)
        : school.subscription;
      return {
        ...school,
        subscription,
        teacherCount: await countFor('app_users', school.id, { role: 'teacher' }),
        studentCount: await countFor('app_users', school.id, { role: 'student' }),
        classroomCount: await countFor('classrooms', school.id),
        subjectCount: await countFor('subjects', school.id),
      };
    })
  );

  return NextResponse.json({ schools: withCounts });
}

export async function POST(request: Request) {
  const caller = requireRole(request, ['master_admin']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { name, code } = await request.json();

  if (!name || !code) {
    return NextResponse.json({ message: 'กรุณากรอกชื่อและรหัสโรงเรียน' }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from('schools')
    .select('id')
    .ilike('code', code)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ message: 'รหัสโรงเรียนนี้ถูกใช้แล้ว' }, { status: 409 });
  }

  const { data: school, error } = await supabaseAdmin
    .from('schools')
    .insert({ name, code, created_by: caller.sub })
    .select('id, name, code, logo_url, is_active, created_at')
    .single();

  if (error || !school) {
    return NextResponse.json(
      { message: error?.message ?? 'Failed to create school' },
      { status: 500 }
    );
  }

  return NextResponse.json({ school }, { status: 201 });
}
