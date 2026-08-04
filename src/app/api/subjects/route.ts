import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { schoolHasFeature } from 'src/lib/school-subscription';
import { canManageViaPermission } from 'src/lib/department-permission-access';
import { subjectCatalogInputSchema } from 'src/features/subject-catalog/schema';
import { getVisibleCurriculum } from 'src/features/curriculum/server/curriculum-service';
import {
  SubjectClassificationError,
  parseSubjectClassification,
} from 'src/features/curriculum/server/parse-subject-classification';
import {
  syncIndicators,
  syncLearningUnits,
  syncLearningOutcomes,
  subjectVisibilityFilter,
} from 'src/features/subject-catalog/server/subject-catalog-service';

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
      'id, curriculum_id, code, name, name_en, credits, study_hours, description, description_en, image_url, academic_year_id, semester_id, academic_years(year), semesters(name), learning_area, activity_type, subject_type, education_stage, grade_levels, learning_standard_code, learning_standards, learning_outcomes, learning_units, indicators, scope, status, created_by, created_at, curriculum:curricula(id, school_id, owner_id, code, name, version, curriculum_type, scope, status)'
    )
    .or(subjectVisibilityFilter(caller))
    .order('name');

  // school_admin sees every subject regardless of status; teachers only see
  // published subjects plus their own drafts.
  if (caller.role !== 'school_admin') {
    query = query.or(`status.eq.published,created_by.eq.${caller.sub}`);
  }

  if (academicYearId) query = query.eq('academic_year_id', academicYearId);
  if (semesterId) query = query.eq('semester_id', semesterId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const subjectIds = (data ?? []).map((subject) => subject.id);
  const [indicatorResult, outcomeResult, unitResult] = subjectIds.length
    ? await Promise.all([
        supabaseAdmin
        .from('curriculum_indicators')
        .select('id, subject_id, code, description, learning_standard')
        .in('subject_id', subjectIds)
        .order('code'),
        supabaseAdmin.from('subject_learning_outcomes').select('id, subject_id, code, description, sequence').in('subject_id', subjectIds).order('sequence'),
        supabaseAdmin.from('subject_learning_units').select('id, subject_id, code, name, description, sequence, estimated_periods').in('subject_id', subjectIds).order('sequence'),
      ])
    : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  const relatedError = indicatorResult.error ?? outcomeResult.error ?? unitResult.error;
  if (relatedError) return NextResponse.json({ message: relatedError.message }, { status: 500 });
  const canManageSchoolSubjects = await canManageViaPermission(caller, 'subjects.manage');

  return NextResponse.json({
    subjects: (data ?? []).map((subject) => ({
      ...subject,
      can_edit:
        subject.created_by === caller.sub ||
        (subject.scope === 'school' && canManageSchoolSubjects),
      curriculum_indicators: (indicatorResult.data ?? []).filter(
        (indicator) => indicator.subject_id === subject.id
      ),
      learning_outcomes_structured: (outcomeResult.data ?? []).filter((item) => item.subject_id === subject.id),
      learning_units_structured: (unitResult.data ?? []).filter((item) => item.subject_id === subject.id),
    })),
  });
}

export async function POST(request: Request) {
  const caller = requireRole(request, ['school_admin', 'teacher']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }
  const body = await request.json();
  const scope: 'school' | 'personal' | 'public' = ['personal', 'public'].includes(body.scope)
    ? body.scope
    : 'school';

  if (scope === 'school' && !caller.schoolId) {
    return NextResponse.json({ message: 'กรุณาเลือกพื้นที่โรงเรียน' }, { status: 400 });
  }

  const isAdminLike =
    scope === 'school' && (await canManageViaPermission(caller, 'subjects.manage'));
  if (
    scope === 'school' &&
    caller.role === 'teacher' &&
    !isAdminLike &&
    !(await schoolHasFeature(caller.schoolId!, 'teacher.manage_subjects', {
      userId: caller.sub,
      role: 'teacher',
    }))
  ) {
    return NextResponse.json(
      { message: 'แพ็กเกจโรงเรียนไม่รองรับการให้ครูสร้างรายวิชา' },
      { status: 403 }
    );
  }

  let classification;
  try {
    classification = await parseSubjectClassification(caller, body);
  } catch (classificationError) {
    if (classificationError instanceof SubjectClassificationError) {
      return NextResponse.json({ message: classificationError.message }, { status: 400 });
    }
    throw classificationError;
  }
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
    (scope === 'school' && (!academicYearId || !semesterId)) ||
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
    educationStage,
    gradeLevels,
    learningStandardCode,
    learningStandards,
    learningOutcomes,
    learningUnits,
    indicators,
  } = classification;

  if (scope === 'school') {
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
  }

  const parsedIndicators = subjectCatalogInputSchema.shape.indicators.safeParse(
    body.curriculumIndicators ?? []
  );
  if (!parsedIndicators.success) {
    return NextResponse.json(
      { message: parsedIndicators.error.issues[0]?.message ?? 'ข้อมูลตัวชี้วัดไม่ถูกต้อง' },
      { status: 400 }
    );
  }
  const curriculumId = typeof body.curriculumId === 'string' ? body.curriculumId : null;
  if (curriculumId && !(await getVisibleCurriculum(caller, curriculumId))) {
    return NextResponse.json({ message: 'ไม่พบหลักสูตรที่เลือก' }, { status: 400 });
  }
  const parsedOutcomes = subjectCatalogInputSchema.shape.learningOutcomesStructured.safeParse(
    body.learningOutcomesStructured ?? []
  );
  const parsedUnits = subjectCatalogInputSchema.shape.learningUnitsStructured.safeParse(
    body.learningUnitsStructured ?? []
  );
  if (!parsedOutcomes.success || !parsedUnits.success) {
    return NextResponse.json({ message: 'ข้อมูลผลลัพธ์หรือหน่วยการเรียนรู้ไม่ถูกต้อง' }, { status: 400 });
  }

  const { data: subject, error } = await supabaseAdmin
    .from('subjects')
    .insert({
      curriculum_id: curriculumId,
      code: typeof code === 'string' && code.trim() ? code.trim() : null,
      name: String(name).trim(),
      name_en: typeof nameEn === 'string' && nameEn.trim() ? nameEn.trim() : null,
      credits: parsedCredits,
      study_hours: parsedStudyHours,
      description:
        typeof description === 'string' && description.trim() ? description.trim() : null,
      description_en:
        typeof descriptionEn === 'string' && descriptionEn.trim() ? descriptionEn.trim() : null,
      academic_year_id: scope === 'school' ? academicYearId : null,
      semester_id: scope === 'school' ? semesterId : null,
      school_id: scope === 'school' ? caller.schoolId : null,
      created_by: caller.sub,
      scope,
      status: body.status === 'published' ? 'published' : 'draft',
      learning_area: learningArea,
      activity_type: activityType,
      subject_type: subjectType,
      education_stage: educationStage,
      grade_levels: gradeLevels,
      learning_standard_code: learningStandardCode,
      learning_standards: learningStandards,
      learning_outcomes: learningOutcomes,
      learning_units: learningUnits,
      indicators,
    })
    .select(
      'id, curriculum_id, code, name, name_en, credits, study_hours, description, description_en, image_url, academic_year_id, semester_id, academic_years(year), semesters(name), learning_area, activity_type, subject_type, education_stage, grade_levels, learning_standard_code, learning_standards, learning_outcomes, learning_units, indicators, scope, status, created_by, created_at, curriculum:curricula(id, school_id, owner_id, code, name, version, curriculum_type, scope, status)'
    )
    .single();

  if (error || !subject) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { message: 'รหัสวิชานี้ถูกใช้แล้วในภาคเรียนที่เลือก' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: error?.message ?? 'Failed to create subject' },
      { status: 500 }
    );
  }

  try {
    await Promise.all([
      syncIndicators(subject.id, parsedIndicators.data, scope === 'school' ? caller.schoolId : null),
      syncLearningOutcomes(subject.id, parsedOutcomes.data),
      syncLearningUnits(subject.id, parsedUnits.data),
    ]);
  } catch (indicatorError) {
    await supabaseAdmin.from('subjects').delete().eq('id', subject.id);
    return NextResponse.json(
      {
        message:
          indicatorError instanceof Error ? indicatorError.message : 'บันทึกตัวชี้วัดไม่สำเร็จ',
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { subject: { ...subject, curriculum_indicators: parsedIndicators.data, learning_outcomes_structured: parsedOutcomes.data, learning_units_structured: parsedUnits.data } },
    { status: 201 }
  );
}
