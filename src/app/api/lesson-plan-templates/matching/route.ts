import type { TemplateType } from 'src/features/templates/types';

import { NextResponse } from 'next/server';

import { requireLessonPlanFeature } from 'src/lib/lesson-plan-feature-access';
import { findMatchingTemplates } from 'src/features/templates/server/template-service';

export async function GET(request: Request) {
  const caller = await requireLessonPlanFeature(request, ['teacher', 'school_admin']);
  if (!caller?.schoolId)
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const templateType = params.get('templateType') as TemplateType | null;
  if (!templateType)
    return NextResponse.json({ message: 'กรุณาระบุประเภท Template' }, { status: 400 });
  try {
    const templates = await findMatchingTemplates(caller, {
      templateType,
      subjectId: params.get('subjectId') || undefined,
      gradeLevel: params.get('gradeLevel') || undefined,
      indicatorIds: params.getAll('indicatorId'),
      teachingMethod: params.get('teachingMethod') || undefined,
      durationMinutes: params.get('durationMinutes')
        ? Number(params.get('durationMinutes'))
        : undefined,
    });
    return NextResponse.json({ templates });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'ค้นหา Template ไม่สำเร็จ' },
      { status: 500 }
    );
  }
}
