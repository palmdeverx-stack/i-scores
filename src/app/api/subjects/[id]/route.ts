import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['school_admin']);

  if (!caller) return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });

  const { id } = await params;
  const { code, name, credits, description, academicYearId, semesterId } = await request.json();
  const parsedCredits = Number(credits);

  if (
    typeof name !== 'string' ||
    !name.trim() ||
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
    .select('id, academic_years!inner(school_id)')
    .eq('id', semesterId)
    .eq('academic_year_id', academicYearId)
    .eq('academic_years.school_id', caller.schoolId)
    .maybeSingle();

  if (!semester) {
    return NextResponse.json({ message: 'ไม่พบภาคเรียนในปีการศึกษาที่เลือก' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('subjects')
    .update({
      name: name.trim(),
      code: typeof code === 'string' && code.trim() ? code.trim() : null,
      credits: parsedCredits,
      description:
        typeof description === 'string' && description.trim() ? description.trim() : null,
      academic_year_id: academicYearId,
      semester_id: semesterId,
    })
    .eq('id', id)
    .eq('school_id', caller.schoolId)
    .select(
      'id, code, name, credits, description, image_url, academic_year_id, semester_id, academic_years(year), semesters(name), created_at'
    )
    .maybeSingle();

  if (error?.code === '23505') {
    return NextResponse.json(
      { message: 'ชื่อหรือรหัสวิชานี้ถูกใช้แล้วในภาคเรียนที่เลือก' },
      { status: 409 }
    );
  }
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ message: 'ไม่พบรายวิชานี้' }, { status: 404 });

  return NextResponse.json({ subject: data });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['school_admin']);

  if (!caller) return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });

  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from('subjects')
    .delete()
    .eq('id', id)
    .eq('school_id', caller.schoolId)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ message: 'ไม่พบรายวิชานี้' }, { status: 404 });

  const folder = `${caller.schoolId}/${id}`;
  const { data: files } = await supabaseAdmin.storage.from('subject-images').list(folder);
  if (files?.length) {
    await supabaseAdmin.storage
      .from('subject-images')
      .remove(files.map((file) => `${folder}/${file.name}`));
  }

  return NextResponse.json({ success: true });
}
