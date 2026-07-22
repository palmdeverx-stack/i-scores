import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

async function assertYearBelongsToSchool(academicYearId: string, schoolId: string | null) {
  const { data } = await supabaseAdmin
    .from('academic_years')
    .select('id, start_date, end_date')
    .eq('id', academicYearId)
    .eq('school_id', schoolId)
    .maybeSingle();

  return data;
}

export async function GET(request: Request) {
  const caller = requireRole(request, ['school_admin', 'teacher']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const academicYearId = searchParams.get('academicYearId');

  if (!academicYearId) {
    return NextResponse.json({ message: 'กรุณาเลือกปีการศึกษา' }, { status: 400 });
  }

  if (!(await assertYearBelongsToSchool(academicYearId, caller.schoolId))) {
    return NextResponse.json({ message: 'ไม่พบปีการศึกษานี้' }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from('semesters')
    .select('id, name, start_date, end_date, is_active, created_at')
    .eq('academic_year_id', academicYearId)
    .order('name');

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ semesters: data });
}

export async function POST(request: Request) {
  const caller = requireRole(request, ['school_admin']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { academicYearId, name, startDate, endDate } = await request.json();

  if (!academicYearId || !name || !startDate || !endDate) {
    return NextResponse.json(
      { message: 'กรุณากรอกชื่อภาคเรียน วันที่เริ่มต้น และวันที่สิ้นสุด' },
      { status: 400 }
    );
  }

  const academicYear = await assertYearBelongsToSchool(academicYearId, caller.schoolId);

  if (!academicYear) {
    return NextResponse.json({ message: 'ไม่พบปีการศึกษานี้' }, { status: 404 });
  }

  if (new Date(endDate) < new Date(startDate)) {
    return NextResponse.json({ message: 'วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น' }, { status: 400 });
  }

  if (
    (academicYear.start_date && startDate < academicYear.start_date) ||
    (academicYear.end_date && endDate > academicYear.end_date)
  ) {
    return NextResponse.json(
      { message: 'ช่วงวันที่ภาคเรียนต้องอยู่ภายในช่วงปีการศึกษา' },
      { status: 400 }
    );
  }

  const { data: overlapping } = await supabaseAdmin
    .from('semesters')
    .select('name, start_date, end_date')
    .eq('academic_year_id', academicYearId)
    .lte('start_date', endDate)
    .gte('end_date', startDate)
    .limit(1);

  if (overlapping?.length) {
    const [existing] = overlapping;
    return NextResponse.json(
      {
        message: `ช่วงวันที่ทับกับภาคเรียน ${existing.name} (${existing.start_date} ถึง ${existing.end_date})`,
      },
      { status: 409 }
    );
  }

  const { data: semester, error } = await supabaseAdmin
    .from('semesters')
    .insert({
      academic_year_id: academicYearId,
      name: String(name).trim(),
      start_date: startDate,
      end_date: endDate,
    })
    .select('id, name, start_date, end_date, is_active, created_at')
    .single();

  if (error || !semester) {
    return NextResponse.json(
      { message: error?.message ?? 'Failed to create semester' },
      { status: 500 }
    );
  }

  return NextResponse.json({ semester }, { status: 201 });
}
