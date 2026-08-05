import * as z from 'zod';
import { NextResponse } from 'next/server';

import { requireLessonPlanFeature } from 'src/lib/lesson-plan-feature-access';
import { applyTemplateToLessonPlan } from 'src/features/templates/server/template-service';

const applySchema = z.object({
  templateId: z.uuid(),
  targetType: z.literal('lesson_plan'),
  targetId: z.uuid(),
  sectionType: z.string().trim().min(1).optional(),
});

export async function POST(request: Request) {
  const caller = await requireLessonPlanFeature(request, ['teacher']);
  if (!caller?.schoolId)
    return NextResponse.json({ message: 'ไม่มีสิทธิ์นำ Template ไปใช้' }, { status: 403 });
  const parsed = applySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ message: 'ข้อมูลปลายทางไม่ถูกต้อง' }, { status: 400 });
  try {
    const patch = await applyTemplateToLessonPlan(
      caller,
      parsed.data.templateId,
      parsed.data.targetId,
      parsed.data.sectionType
    );
    return NextResponse.json({ success: true, patch });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'นำ Template ไปใช้ไม่สำเร็จ';
    return NextResponse.json({ message }, { status: /ไม่พบ/.test(message) ? 404 : 500 });
  }
}
