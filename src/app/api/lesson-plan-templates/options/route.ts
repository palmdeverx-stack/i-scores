import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { isTemplateAIEnabled } from 'src/features/ai/config/ai.config';
import { requireLessonPlanFeature } from 'src/lib/lesson-plan-feature-access';
import { listVisibleSubjects } from 'src/features/subject-catalog/server/subject-catalog-service';
import {
  getTemplates,
  canManageSchoolTemplates,
} from 'src/features/templates/server/template-service';

export async function GET(request: Request) {
  const caller = await requireLessonPlanFeature(request, ['teacher', 'school_admin']);
  if (!caller) return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  try {
    let masterQuery = supabaseAdmin
      .from('subject_master_items')
      .select('category, code, name, sort_order')
      .in('category', ['learning_area', 'grade_level'])
      .eq('is_active', true)
      .order('sort_order')
      .order('name');
    masterQuery = caller.schoolId
      ? masterQuery.eq('school_id', caller.schoolId)
      : masterQuery.is('school_id', null);

    const calendarQuery = caller.schoolId
      ? supabaseAdmin
          .from('academic_years')
          .select('year, semesters(name)')
          .eq('school_id', caller.schoolId)
          .order('year', { ascending: false })
      : Promise.resolve({ data: [], error: null });

    const [subjects, templates, canManageSchool, masterResult, calendarResult] = await Promise.all([
      listVisibleSubjects(caller),
      getTemplates(caller, { status: 'active' }),
      caller.schoolId ? canManageSchoolTemplates(caller) : Promise.resolve(false),
      masterQuery,
      calendarQuery,
    ]);
    if (masterResult.error) throw masterResult.error;
    if (calendarResult.error) throw calendarResult.error;

    const masterItems = masterResult.data ?? [];
    const calendarRows = (calendarResult.data ?? []) as Array<{
      year: string;
      semesters: Array<{ name: string }> | { name: string } | null;
    }>;
    const semesters = calendarRows.flatMap((row) =>
      Array.isArray(row.semesters)
        ? row.semesters.map((semester) => semester.name)
        : row.semesters?.name
          ? [row.semesters.name]
          : []
    );
    return NextResponse.json({
      subjects: subjects.map(
        ({ indicators: _indicators, can_edit: _canEdit, ...subject }) => subject
      ),
      indicators: subjects.flatMap((subject) => subject.indicators),
      templates: templates
        .filter((template) => template.template_type !== 'lesson_plan')
        .map(({ id, name, template_type, scope, content }) => ({
          id,
          name,
          template_type,
          scope,
          content,
        })),
      learningAreas: masterItems
        .filter((item) => item.category === 'learning_area')
        .map(({ code, name }) => ({ code, name })),
      gradeLevels: masterItems
        .filter((item) => item.category === 'grade_level')
        .map(({ code, name }) => ({ code, name })),
      academicYears: calendarRows.map((row) => row.year),
      semesters: [...new Set(semesters)],
      canManageSchool,
      aiEnabled: isTemplateAIEnabled,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'โหลดคลังรายวิชาไม่สำเร็จ' },
      { status: 500 }
    );
  }
}
