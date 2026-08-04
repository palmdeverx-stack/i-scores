import type {
  TemplateType,
  TemplateScope,
  TemplateStatus,
  TemplateFilters,
} from 'src/features/templates/types';

import { ZodError } from 'zod';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { parseTemplateInput } from 'src/features/templates/schemas';
import {
  getTemplates,
  createTemplate,
  getTemplatesPage,
} from 'src/features/templates/server/template-service';
import {
  CurriculumReferenceError,
  resolveCurriculumReference,
} from 'src/features/curriculum/server/resolve-curriculum-reference';

function errorResponse(error: unknown) {
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

export async function GET(request: Request) {
  const caller = requireRole(request, ['teacher', 'school_admin']);
  if (!caller?.schoolId)
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const filters: TemplateFilters = {
    search: params.get('search') || undefined,
    tab: (params.get('tab') || 'all') as TemplateFilters['tab'],
    templateType: (params.get('templateType') || undefined) as TemplateType | undefined,
    scope: (params.get('scope') || undefined) as TemplateScope | undefined,
    status: (params.get('status') || undefined) as TemplateStatus | undefined,
    gradeLevel: params.get('gradeLevel') || undefined,
    subjectId: params.get('subjectId') || undefined,
    tag: params.get('tag') || undefined,
    ownerId: params.get('ownerId') || undefined,
    schoolId: params.get('schoolId') || undefined,
  };
  try {
    if (params.has('limit') || params.has('offset')) {
      const requestedLimit = Number(params.get('limit'));
      const requestedOffset = Number(params.get('offset'));
      const limit = Number.isFinite(requestedLimit)
        ? Math.min(Math.max(Math.floor(requestedLimit), 1), 50)
        : 12;
      const offset = Number.isFinite(requestedOffset)
        ? Math.max(Math.floor(requestedOffset), 0)
        : 0;
      return NextResponse.json(await getTemplatesPage(caller, filters, { limit, offset }));
    }
    return NextResponse.json({ templates: await getTemplates(caller, filters) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const caller = requireRole(request, ['teacher', 'school_admin']);
  if (!caller?.schoolId)
    return NextResponse.json({ message: 'ไม่มีสิทธิ์สร้าง Template' }, { status: 403 });
  try {
    const input = parseTemplateInput(await request.json());
    const curriculum = await resolveCurriculumReference(caller, input);
    const template = await createTemplate(caller, { ...input, ...curriculum });
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
