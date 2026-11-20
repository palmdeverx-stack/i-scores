import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { canManageViaPermission } from 'src/lib/department-permission-access';

import { enrollmentImportSchema } from 'src/sections/enrollment/enrollment-import-schema';

export async function POST(request: Request) {
  const caller = requireRole(request, ['school_admin', 'teacher']);
  if (!caller?.schoolId || !(await canManageViaPermission(caller, 'enrollments.manage'))) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์นำเข้าการลงทะเบียน' }, { status: 403 });
  }

  const parsed = enrollmentImportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'ข้อมูลสำหรับนำเข้าไม่ถูกต้อง' }, { status: 400 });
  }

  const { academicYearId, rows } = parsed.data;
  const studentCodes = [...new Set(rows.map((row) => row.studentCode))];
  const classroomNames = [...new Set(rows.map((row) => row.classroomName))];
  const [students, classrooms] = await Promise.all([
    supabaseAdmin
      .from('app_users')
      .select('id, student_code')
      .eq('school_id', caller.schoolId)
      .eq('role', 'student')
      .eq('is_active', true)
      .eq('student_status', 'studying')
      .in('student_code', studentCodes),
    supabaseAdmin
      .from('classrooms')
      .select('id, name')
      .eq('school_id', caller.schoolId)
      .eq('academic_year_id', academicYearId)
      .in('name', classroomNames),
  ]);
  const loadFailure = () =>
    NextResponse.json({ message: 'ตรวจสอบข้อมูลไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });

  if (students.error || classrooms.error) return loadFailure();

  const studentByCode = new Map(students.data.map((student) => [student.student_code, student.id]));
  const classroomByName = new Map(classrooms.data.map((room) => [room.name, room.id]));
  const studentIds = students.data.map((student) => student.id);
  const existing = studentIds.length
    ? await supabaseAdmin
        .from('enrollments')
        .select('student_id')
        .eq('academic_year_id', academicYearId)
        .in('student_id', studentIds)
    : { data: [], error: null };
  if (existing.error) return loadFailure();

  const enrolled = new Set(existing.data.map((item) => item.student_id));
  const seen = new Set<string>();
  const errors: { row: number; message: string }[] = [];
  const enrollments = rows.flatMap(({ row, studentCode, classroomName, studentNumber }) => {
    const studentId = studentByCode.get(studentCode);
    const classroomId = classroomByName.get(classroomName);
    let message: string | undefined;
    if (seen.has(studentCode)) message = 'รหัสนักเรียนซ้ำในไฟล์';
    else if (!studentId) message = 'ไม่พบนักเรียนที่อยู่ในสถานะกำลังศึกษาในโรงเรียนนี้';
    else if (!classroomId) message = 'ไม่พบห้องเรียนในปีการศึกษาที่เลือก';
    else if (enrolled.has(studentId)) message = 'นักเรียนมีห้องเรียนในปีการศึกษานี้แล้ว';

    seen.add(studentCode);
    if (message || !studentId || !classroomId) {
      errors.push({ row, message: message ?? 'ข้อมูลการลงทะเบียนไม่ถูกต้อง' });
      return [];
    }
    return [
      { student_id: studentId, classroom_id: classroomId, student_number: studentNumber || null },
    ];
  });

  if (errors.length) {
    return NextResponse.json(
      { message: 'กรุณาแก้ไขข้อมูลในไฟล์แล้วนำเข้าอีกครั้ง', errors },
      { status: 409 }
    );
  }

  // A single insert keeps the batch atomic, including a duplicate created by a concurrent request.
  const { error } = await supabaseAdmin.from('enrollments').insert(enrollments);
  if (error?.code === '23505') {
    return NextResponse.json(
      { message: 'มีนักเรียนที่ลงทะเบียนในปีนี้แล้ว กรุณาตรวจสอบแล้วนำเข้าอีกครั้ง' },
      { status: 409 }
    );
  }
  if (error) {
    return NextResponse.json({ message: 'บันทึกการลงทะเบียนไม่สำเร็จ' }, { status: 500 });
  }
  return NextResponse.json({ createdCount: enrollments.length }, { status: 201 });
}
