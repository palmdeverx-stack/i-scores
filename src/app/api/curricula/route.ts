import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { canManageViaPermission } from 'src/lib/department-permission-access';

function visibility(caller: NonNullable<ReturnType<typeof requireRole>>) {
  const filters = [
    `owner_id.eq.${caller.sub}`,
    'and(scope.eq.system,status.eq.published)',
    'and(scope.eq.public,status.eq.published)',
  ];
  if (caller.schoolId) filters.push(`and(scope.eq.school,school_id.eq.${caller.schoolId})`);
  return filters.join(',');
}

export async function GET(request: Request) {
  const caller = requireRole(request, ['teacher', 'school_admin']);
  if (!caller) return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  const { data, error } = await supabaseAdmin
    .from('curricula')
    .select('id, code, name, version, curriculum_type, scope, status, school_id, owner_id')
    .or(visibility(caller))
    .order('name');
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ curricula: data ?? [] });
}

export async function POST(request: Request) {
  const caller = requireRole(request, ['teacher', 'school_admin']);
  if (!caller) return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 300) : '';
  const scope = ['school', 'public'].includes(body.scope) ? body.scope : 'personal';
  if (!name) return NextResponse.json({ message: 'กรุณากรอกชื่อหลักสูตร' }, { status: 400 });
  if (scope === 'school') {
    if (!caller.schoolId || !(await canManageViaPermission(caller, 'subjects.manage'))) {
      return NextResponse.json({ message: 'ไม่มีสิทธิ์สร้างหลักสูตรโรงเรียน' }, { status: 403 });
    }
  }
  const { data, error } = await supabaseAdmin
    .from('curricula')
    .insert({
      name,
      code: typeof body.code === 'string' && body.code.trim() ? body.code.trim().slice(0, 100) : null,
      version:
        typeof body.version === 'string' && body.version.trim()
          ? body.version.trim().slice(0, 200)
          : null,
      scope,
      curriculum_type: scope === 'school' ? 'school' : 'custom',
      school_id: scope === 'school' ? caller.schoolId : null,
      owner_id: scope === 'school' ? null : caller.sub,
      status: 'published',
    })
    .select('id, code, name, version, curriculum_type, scope, status, school_id, owner_id')
    .single();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ curriculum: data }, { status: 201 });
}
