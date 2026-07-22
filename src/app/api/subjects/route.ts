import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

export async function GET(request: Request) {
  const caller = requireRole(request, ['school_admin', 'teacher']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const academicYearId = searchParams.get('academicYearId');
  const semesterId = searchParams.get('semesterId');

  let query = supabaseAdmin
    .from('subjects')
    .select(
      'id, code, name, credits, description, image_url, academic_year_id, semester_id, academic_years(year), semesters(name), created_at'
    )
    .eq('school_id', caller.schoolId)
    .order('name');

  if (academicYearId) query = query.eq('academic_year_id', academicYearId);
  if (semesterId) query = query.eq('semester_id', semesterId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ subjects: data });
}

export async function POST(request: Request) {
  const caller = requireRole(request, ['school_admin']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { code, name, credits, description, academicYearId, semesterId } = await request.json();
  const parsedCredits = Number(credits);

  if (
    !name ||
    !academicYearId ||
    !semesterId ||
    !Number.isFinite(parsedCredits) ||
    parsedCredits < 0
  ) {
    return NextResponse.json(
      { message: 'กรุณากรอกชื่อ หน่วยกิต ปีการศึกษา และภาคเรียนให้ครบถ้วน' },
      { status: 400 }
    );
  }

  const { data: semester } = await supabaseAdmin
    .from('semesters')
    .select('id, academic_year_id, academic_years!inner(school_id)')
    .eq('id', semesterId)
    .eq('academic_year_id', academicYearId)
    .eq('academic_years.school_id', caller.schoolId)
    .maybeSingle();

  if (!semester) {
    return NextResponse.json({ message: 'ไม่พบภาคเรียนในปีการศึกษาที่เลือก' }, { status: 400 });
  }

  const { data: subject, error } = await supabaseAdmin
    .from('subjects')
    .insert({
      code: typeof code === 'string' && code.trim() ? code.trim() : null,
      name: String(name).trim(),
      credits: parsedCredits,
      description:
        typeof description === 'string' && description.trim() ? description.trim() : null,
      academic_year_id: academicYearId,
      semester_id: semesterId,
      school_id: caller.schoolId,
    })
    .select(
      'id, code, name, credits, description, image_url, academic_year_id, semester_id, academic_years(year), semesters(name), created_at'
    )
    .single();

  if (error || !subject) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { message: 'ชื่อหรือรหัสวิชานี้ถูกใช้แล้วในภาคเรียนที่เลือก' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: error?.message ?? 'Failed to create subject' },
      { status: 500 }
    );
  }

  return NextResponse.json({ subject }, { status: 201 });
}
