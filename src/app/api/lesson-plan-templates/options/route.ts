import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { isTemplateAIEnabled } from 'src/features/ai/config/ai.config';
import { canManageSchoolTemplates } from 'src/features/templates/server/template-service';
import { listVisibleSubjects } from 'src/features/subject-catalog/server/subject-catalog-service';

export async function GET(request: Request) {
  const caller = requireRole(request, ['teacher', 'school_admin']);
  if (!caller) return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  try {
    const subjects = await listVisibleSubjects(caller);
    return NextResponse.json({
      subjects: subjects.map(
        ({ indicators: _indicators, can_edit: _canEdit, ...subject }) => subject
      ),
      indicators: subjects.flatMap((subject) => subject.indicators),
      canManageSchool: !!caller.schoolId && (await canManageSchoolTemplates(caller)),
      aiEnabled: isTemplateAIEnabled,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'โหลดคลังรายวิชาไม่สำเร็จ' },
      { status: 500 }
    );
  }
}
