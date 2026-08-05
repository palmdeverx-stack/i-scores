import { NextResponse } from 'next/server';

import { requireLessonPlanFeature } from 'src/lib/lesson-plan-feature-access';
import {
  duplicateTemplate,
  setTemplateArchived,
} from 'src/features/templates/server/template-service';

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const caller = await requireLessonPlanFeature(request, ['teacher', 'school_admin']);
  if (!caller?.schoolId)
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ดำเนินการ' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const action =
    body && typeof body === 'object' ? String((body as Record<string, unknown>).action ?? '') : '';
  const { id } = await params;
  try {
    if (action === 'duplicate')
      return NextResponse.json({ template: await duplicateTemplate(caller, id) }, { status: 201 });
    if (action === 'archive')
      return NextResponse.json({ template: await setTemplateArchived(caller, id, true) });
    if (action === 'restore')
      return NextResponse.json({ template: await setTemplateArchived(caller, id, false) });
    return NextResponse.json({ message: 'Action ไม่ถูกต้อง' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ';
    return NextResponse.json({ message }, { status: /ไม่มีสิทธิ์/.test(message) ? 403 : 500 });
  }
}
