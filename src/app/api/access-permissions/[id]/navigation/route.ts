import { z } from 'zod';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import {
  isPersonalWorkspaceOwner,
  getDepartmentGrantedPermissions,
  getEffectiveDepartmentPermissions,
} from 'src/lib/department-permission-access';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId)
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ตรวจสอบเมนูของบุคลากร' }, { status: 403 });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return NextResponse.json({ message: 'รหัสบุคลากรไม่ถูกต้อง' }, { status: 400 });
  const profile = await supabaseAdmin
    .from('app_users')
    .select('id,role,is_active,is_school_director,first_name,last_name,username')
    .eq('id', id)
    .eq('school_id', caller.schoolId)
    .eq('role', 'teacher')
    .maybeSingle();
  if (profile.error)
    return NextResponse.json({ message: 'ตรวจสอบบุคลากรไม่สำเร็จ' }, { status: 503 });
  if (!profile.data)
    return NextResponse.json({ message: 'ไม่พบบุคลากรในโรงเรียน' }, { status: 404 });
  const [view, manage, memberships, personal] = await Promise.all([
    getDepartmentGrantedPermissions(id, caller.schoolId),
    getEffectiveDepartmentPermissions(id, caller.schoolId),
    supabaseAdmin
      .from('department_members')
      .select('role_in_department,department:departments!inner(id,name,school_id)')
      .eq('teacher_id', id)
      .eq('department.school_id', caller.schoolId),
    isPersonalWorkspaceOwner(id, caller.schoolId),
  ]);
  if (memberships.error)
    return NextResponse.json({ message: 'โหลดสมาชิกฝ่ายไม่สำเร็จ' }, { status: 503 });
  const departments = (memberships.data ?? []).flatMap((row) => {
    const department = row.department as unknown as { id: string; name: string; school_id: string };
    return department?.school_id === caller.schoolId
      ? [{ id: department.id, name: department.name, role_in_department: row.role_in_department }]
      : [];
  });
  return NextResponse.json(
    {
      user: {
        ...profile.data,
        department_permissions: view,
        manage_permissions: manage,
        departments,
        is_personal_workspace: personal,
      },
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
