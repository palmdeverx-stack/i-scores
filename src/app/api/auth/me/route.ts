import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { toPublicUser, getBearerToken, verifyAppToken } from 'src/lib/auth-token';
import { getDepartmentGrantedPermissions } from 'src/lib/department-permission-access';

// ----------------------------------------------------------------------

export async function GET(request: Request) {
  const token = getBearerToken(request);
  const payload = token ? verifyAppToken(token) : null;

  if (!payload) {
    return NextResponse.json({ message: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }

  const { data: user } = await supabaseAdmin
    .from('app_users')
    .select('*')
    .eq('id', payload.sub)
    .single();

  const studentCannotAccess =
    user?.role === 'student' && (user.student_status ?? 'studying') !== 'studying';

  if (!user || user.is_active === false || studentCannotAccess) {
    return NextResponse.json({ message: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }

  let departments: { id: string; name: string; role_in_department: 'head' | 'member' }[] = [];
  let departmentPermissions: string[] = [];
  if (user.role === 'teacher') {
    const { data: membership } = await supabaseAdmin
      .from('department_members')
      .select('role_in_department, department:departments(id, name)')
      .eq('teacher_id', user.id);
    departments = (membership ?? []).map((row) => ({
      id: (row.department as unknown as { id: string; name: string }).id,
      name: (row.department as unknown as { id: string; name: string }).name,
      role_in_department: row.role_in_department as 'head' | 'member',
    }));
    if (user.school_id) {
      // View-level: any member of a department sees the menus/data the
      // department has been granted — editing still requires a personal
      // grant, checked server-side via canManageViaPermission on each write.
      departmentPermissions = await getDepartmentGrantedPermissions(user.id, user.school_id);
    }
  }

  return NextResponse.json({
    user: { ...toPublicUser(user), departments, department_permissions: departmentPermissions },
  });
}
