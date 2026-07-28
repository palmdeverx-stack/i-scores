import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { canManageViaPermission } from 'src/lib/department-permission-access';

// ----------------------------------------------------------------------

const VALID_LEARNING_AREAS = [
  'thai',
  'mathematics',
  'science_technology',
  'social_studies',
  'health_pe',
  'art',
  'occupations_technology',
  'foreign_language',
  'student_development_activity',
];
const VALID_ACTIVITY_TYPES = ['guidance', 'scout_cadet', 'club', 'social_service'];
const VALID_SUBJECT_TYPES = ['basic', 'additional', 'activity'];
const VALID_GRADE_LEVELS = [
  'ป.1',
  'ป.2',
  'ป.3',
  'ป.4',
  'ป.5',
  'ป.6',
  'ม.1',
  'ม.2',
  'ม.3',
  'ม.4',
  'ม.5',
  'ม.6',
];

function parseCurriculumFields(body: Record<string, unknown>) {
  const learningArea =
    typeof body.learningArea === 'string' && VALID_LEARNING_AREAS.includes(body.learningArea)
      ? body.learningArea
      : null;
  const activityType =
    learningArea === 'student_development_activity' &&
    typeof body.activityType === 'string' &&
    VALID_ACTIVITY_TYPES.includes(body.activityType)
      ? body.activityType
      : null;
  const subjectType =
    typeof body.subjectType === 'string' && VALID_SUBJECT_TYPES.includes(body.subjectType)
      ? body.subjectType
      : null;
  const gradeLevels = Array.isArray(body.gradeLevels)
    ? body.gradeLevels.filter(
        (level): level is string =>
          typeof level === 'string' && VALID_GRADE_LEVELS.includes(level)
      )
    : [];

  const parseTextList = (value: unknown) =>
    Array.isArray(value)
      ? value
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 200)
      : [];

  return {
    learningArea,
    activityType,
    subjectType,
    gradeLevels,
    learningStandards: parseTextList(body.learningStandards),
    learningOutcomes: parseTextList(body.learningOutcomes),
    learningUnits: parseTextList(body.learningUnits),
    indicators: parseTextList(body.indicators),
  };
}

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['school_admin', 'teacher']);

  if (!caller || !(await canManageViaPermission(caller, 'subjects.manage'))) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from('subjects')
    .select(
      'id, code, name, name_en, credits, study_hours, description, description_en, image_url, academic_year_id, semester_id, academic_years(year), semesters(name), learning_area, activity_type, subject_type, grade_levels, learning_standards, learning_outcomes, learning_units, indicators, created_at'
    )
    .eq('id', id)
    .eq('school_id', caller.schoolId)
    .maybeSingle();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ message: 'ไม่พบรายวิชานี้' }, { status: 404 });

  return NextResponse.json({ subject: data });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['school_admin', 'teacher']);

  if (!caller || !(await canManageViaPermission(caller, 'subjects.manage'))) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const {
    code,
    name,
    nameEn,
    credits,
    studyHours,
    description,
    descriptionEn,
    academicYearId,
    semesterId,
  } = body;
  const parsedCredits = Number(credits);
  const parsedStudyHours = Number(studyHours);

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    !academicYearId ||
    !semesterId ||
    !Number.isFinite(parsedCredits) ||
    parsedCredits < 0 ||
    !Number.isFinite(parsedStudyHours) ||
    parsedStudyHours < 0
  ) {
    return NextResponse.json(
      { message: 'กรุณากรอกชื่อ หน่วยกิต ชั่วโมงเรียน ปีการศึกษา และภาคเรียนให้ครบถ้วน' },
      { status: 400 }
    );
  }

  const {
    learningArea,
    activityType,
    subjectType,
    gradeLevels,
    learningStandards,
    learningOutcomes,
    learningUnits,
    indicators,
  } = parseCurriculumFields(body);

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
      name_en: typeof nameEn === 'string' && nameEn.trim() ? nameEn.trim() : null,
      code: typeof code === 'string' && code.trim() ? code.trim() : null,
      credits: parsedCredits,
      study_hours: parsedStudyHours,
      description:
        typeof description === 'string' && description.trim() ? description.trim() : null,
      description_en:
        typeof descriptionEn === 'string' && descriptionEn.trim() ? descriptionEn.trim() : null,
      academic_year_id: academicYearId,
      semester_id: semesterId,
      learning_area: learningArea,
      activity_type: activityType,
      subject_type: subjectType,
      grade_levels: gradeLevels,
      learning_standards: learningStandards,
      learning_outcomes: learningOutcomes,
      learning_units: learningUnits,
      indicators,
    })
    .eq('id', id)
    .eq('school_id', caller.schoolId)
    .select(
      'id, code, name, name_en, credits, study_hours, description, description_en, image_url, academic_year_id, semester_id, academic_years(year), semesters(name), learning_area, activity_type, subject_type, grade_levels, learning_standards, learning_outcomes, learning_units, indicators, created_at'
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
  const caller = requireRole(request, ['school_admin', 'teacher']);

  if (!caller || !(await canManageViaPermission(caller, 'subjects.manage'))) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

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
