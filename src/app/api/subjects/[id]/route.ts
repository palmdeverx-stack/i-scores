import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
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

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['school_admin', 'teacher']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  let selectQuery = supabaseAdmin
    .from('subjects')
    .select(
      'id, curriculum_id, code, name, name_en, credits, study_hours, description, description_en, image_url, academic_year_id, semester_id, academic_years(year), semesters(name), learning_area, activity_type, subject_type, education_stage, grade_levels, learning_standard_code, learning_standards, learning_outcomes, learning_units, indicators, scope, status, created_by, created_at, curriculum:curricula(id, school_id, owner_id, code, name, version, curriculum_type, scope, status)'
    )
    .eq('id', id)
    .or(subjectVisibilityFilter(caller));

  // school_admin can see every subject regardless of status; teachers only
  // see published subjects plus their own drafts.
  if (caller.role !== 'school_admin') {
    selectQuery = selectQuery.or(`status.eq.published,created_by.eq.${caller.sub}`);
  }

  const { data, error } = await selectQuery.maybeSingle();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ message: 'ไม่พบรายวิชานี้' }, { status: 404 });

  const [indicatorResult, outcomeResult, unitResult] = await Promise.all([
    supabaseAdmin.from('curriculum_indicators').select('id, subject_id, code, description, learning_standard').eq('subject_id', id).order('code'),
    supabaseAdmin.from('subject_learning_outcomes').select('id, subject_id, code, description, sequence').eq('subject_id', id).order('sequence'),
    supabaseAdmin.from('subject_learning_units').select('id, subject_id, code, name, description, sequence, estimated_periods').eq('subject_id', id).order('sequence'),
  ]);
  const relatedError = indicatorResult.error ?? outcomeResult.error ?? unitResult.error;
  if (relatedError) return NextResponse.json({ message: relatedError.message }, { status: 500 });

  return NextResponse.json({
    subject: { ...data, curriculum_indicators: indicatorResult.data ?? [], learning_outcomes_structured: outcomeResult.data ?? [], learning_units_structured: unitResult.data ?? [] },
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['school_admin', 'teacher']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const { data: current } = await supabaseAdmin
    .from('subjects')
    .select('id, scope, school_id, created_by')
    .eq('id', id)
    .or(subjectVisibilityFilter(caller))
    .maybeSingle();
  if (!current) return NextResponse.json({ message: 'ไม่พบรายวิชานี้' }, { status: 404 });

  const canEdit =
    current.scope === 'school'
      ? current.school_id === caller.schoolId &&
        (await canManageViaPermission(caller, 'subjects.manage'))
      : ['personal', 'public'].includes(current.scope) && current.created_by === caller.sub;
  if (!canEdit)
    return NextResponse.json({ message: 'ไม่มีสิทธิ์แก้ไขรายวิชานี้' }, { status: 403 });

  const body = await request.json();
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
    (current.scope === 'school' && (!academicYearId || !semesterId)) ||
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
  const status = body.status === 'published' ? 'published' : 'draft';

  if (current.scope === 'school') {
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
  const parsedOutcomes = subjectCatalogInputSchema.shape.learningOutcomesStructured.safeParse(body.learningOutcomesStructured ?? []);
  const parsedUnits = subjectCatalogInputSchema.shape.learningUnitsStructured.safeParse(body.learningUnitsStructured ?? []);
  if (!parsedOutcomes.success || !parsedUnits.success) {
    return NextResponse.json({ message: 'ข้อมูลผลลัพธ์หรือหน่วยการเรียนรู้ไม่ถูกต้อง' }, { status: 400 });
  }

  let updateQuery = supabaseAdmin
    .from('subjects')
    .update({
      curriculum_id: curriculumId,
      name: name.trim(),
      name_en: typeof nameEn === 'string' && nameEn.trim() ? nameEn.trim() : null,
      code: typeof code === 'string' && code.trim() ? code.trim() : null,
      credits: parsedCredits,
      study_hours: parsedStudyHours,
      description:
        typeof description === 'string' && description.trim() ? description.trim() : null,
      description_en:
        typeof descriptionEn === 'string' && descriptionEn.trim() ? descriptionEn.trim() : null,
      academic_year_id: current.scope === 'school' ? academicYearId : null,
      semester_id: current.scope === 'school' ? semesterId : null,
      status,
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
    .eq('id', id);

  // school_admin can edit every subject regardless of status; teachers only
  // reach published subjects plus their own drafts.
  if (caller.role !== 'school_admin') {
    updateQuery = updateQuery.or(`status.eq.published,created_by.eq.${caller.sub}`);
  }

  const { data, error } = await updateQuery
    .select(
      'id, curriculum_id, code, name, name_en, credits, study_hours, description, description_en, image_url, academic_year_id, semester_id, academic_years(year), semesters(name), learning_area, activity_type, subject_type, education_stage, grade_levels, learning_standard_code, learning_standards, learning_outcomes, learning_units, indicators, scope, status, created_by, created_at, curriculum:curricula(id, school_id, owner_id, code, name, version, curriculum_type, scope, status)'
    )
    .maybeSingle();

  if (error?.code === '23505') {
    return NextResponse.json(
      { message: 'รหัสวิชานี้ถูกใช้แล้วในภาคเรียนที่เลือก' },
      { status: 409 }
    );
  }
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ message: 'ไม่พบรายวิชานี้' }, { status: 404 });

  try {
    await Promise.all([
      syncIndicators(id, parsedIndicators.data, current.scope === 'school' ? caller.schoolId : null),
      syncLearningOutcomes(id, parsedOutcomes.data),
      syncLearningUnits(id, parsedUnits.data),
    ]);
  } catch (indicatorError) {
    return NextResponse.json(
      {
        message:
          indicatorError instanceof Error ? indicatorError.message : 'บันทึกตัวชี้วัดไม่สำเร็จ',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    subject: { ...data, scope: current.scope, curriculum_indicators: parsedIndicators.data, learning_outcomes_structured: parsedOutcomes.data, learning_units_structured: parsedUnits.data },
  });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['school_admin', 'teacher']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const { data: current } = await supabaseAdmin
    .from('subjects')
    .select('id, scope, school_id, created_by')
    .eq('id', id)
    .or(subjectVisibilityFilter(caller))
    .maybeSingle();
  if (!current) return NextResponse.json({ message: 'ไม่พบรายวิชานี้' }, { status: 404 });

  const canDelete =
    current.scope === 'school'
      ? current.school_id === caller.schoolId &&
        (await canManageViaPermission(caller, 'subjects.manage'))
      : ['personal', 'public'].includes(current.scope) && current.created_by === caller.sub;
  if (!canDelete) return NextResponse.json({ message: 'ไม่มีสิทธิ์ลบรายวิชานี้' }, { status: 403 });

  let deleteQuery = supabaseAdmin.from('subjects').delete().eq('id', id);

  // school_admin can delete every subject regardless of status; teachers
  // only reach published subjects plus their own drafts.
  if (caller.role !== 'school_admin') {
    deleteQuery = deleteQuery.or(`status.eq.published,created_by.eq.${caller.sub}`);
  }

  const { data, error } = await deleteQuery.select('id').maybeSingle();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ message: 'ไม่พบรายวิชานี้' }, { status: 404 });

  const folder = `${current.school_id ?? caller.sub}/${id}`;
  const { data: files } = await supabaseAdmin.storage.from('subject-images').list(folder);
  if (files?.length) {
    await supabaseAdmin.storage
      .from('subject-images')
      .remove(files.map((file) => `${folder}/${file.name}`));
  }

  return NextResponse.json({ success: true });
}
