import { ZodError } from 'zod';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { parseTemplateInput } from 'src/features/templates/schemas';
import {
  CurriculumReferenceError,
  resolveCurriculumReference,
} from 'src/features/curriculum/server/resolve-curriculum-reference';
import {
  updateTemplate,
  deleteTemplate,
  getTemplateById,
  canReadTemplate,
} from 'src/features/templates/server/template-service';

type Context = { params: Promise<{ id: string }> };

function failure(error: unknown) {
  if (error instanceof CurriculumReferenceError)
    return NextResponse.json({ message: error.message }, { status: 400 });
  if (error instanceof ZodError)
    return NextResponse.json(
      { message: error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง', issues: error.issues },
      { status: 400 }
    );
  const message = error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ';
  return NextResponse.json({ message }, { status: /ไม่มีสิทธิ์/.test(message) ? 403 : 500 });
}

export async function GET(request: Request, { params }: Context) {
  const caller = requireRole(request, ['teacher', 'school_admin']);
  if (!caller) return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  const template = await getTemplateById((await params).id);
  if (!(await canReadTemplate(caller, template)))
    return NextResponse.json({ message: 'ไม่พบ Template' }, { status: 404 });
  return NextResponse.json({ template });
}

export async function PATCH(request: Request, { params }: Context) {
  const caller = requireRole(request, ['teacher', 'school_admin']);
  if (!caller?.schoolId) return NextResponse.json({ message: 'ไม่มีสิทธิ์แก้ไข' }, { status: 403 });
  try {
    const input = parseTemplateInput(await request.json());
    const curriculum = await resolveCurriculumReference(caller, input);
    return NextResponse.json({
      template: await updateTemplate(caller, (await params).id, { ...input, ...curriculum }),
    });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const caller = requireRole(request, ['teacher', 'school_admin']);
  if (!caller?.schoolId) return NextResponse.json({ message: 'ไม่มีสิทธิ์ลบ' }, { status: 403 });
  try {
    await deleteTemplate(caller, (await params).id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return failure(error);
  }
}
