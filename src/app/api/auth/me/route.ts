import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { listUserWorkspaces } from 'src/lib/user-workspaces';
import { toPublicUser, verifyAppToken, getRequestToken } from 'src/lib/auth-token';
import { DEPARTMENT_PERMISSION_KEYS } from 'src/lib/department-permissions-config';
import {
  getDepartmentGrantedPermissions,
  getEffectiveDepartmentPermissions,
} from 'src/lib/department-permission-access';

// ----------------------------------------------------------------------

async function resolveAuthProvider(
  sessionProvider: 'password' | 'google' | undefined,
  authUserId: string | null | undefined
) {
  if (sessionProvider || !authUserId) return sessionProvider ?? 'password';
  const { data } = await supabaseAdmin.auth.admin.getUserById(authUserId);
  const providers = data.user?.identities?.map((identity) => identity.provider) ?? [];
  return data.user?.app_metadata.provider === 'google' || providers.includes('google')
    ? 'google'
    : 'password';
}

export async function GET(request: Request) {
  const token = getRequestToken(request);
  const payload = token ? verifyAppToken(token) : null;

  if (!payload) {
    return NextResponse.json({ message: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }

  if (payload.role === 'marketplace_user') {
    const { data: marketplaceUser } = await supabaseAdmin
      .from('marketplace_users')
      .select('id, username, email, first_name, last_name, role, is_active, created_at, auth_user_id')
      .eq('id', payload.sub)
      .maybeSingle();
    if (!marketplaceUser?.is_active) {
      return NextResponse.json({ message: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }
    const authProvider = await resolveAuthProvider(
      payload.authProvider,
      marketplaceUser.auth_user_id
    );

    return NextResponse.json({
      user: {
        ...marketplaceUser,
        role: 'marketplace_user',
        school_id: null,
        auth_provider: authProvider,
      },
    });
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
  const authProvider = await resolveAuthProvider(payload.authProvider, user.auth_user_id);

  let departments: { id: string; name: string; role_in_department: 'head' | 'member' }[] = [];
  let departmentPermissions: string[] = [];
  let managePermissions: string[] = [];
  let isPersonalWorkspace = false;
  const workspaces = user.auth_user_id ? await listUserWorkspaces(user.auth_user_id) : [];
  if (user.role === 'teacher') {
    const { data: workspace } = user.school_id
      ? await supabaseAdmin
          .from('schools')
          .select('workspace_type, owner_auth_user_id')
          .eq('id', user.school_id)
          .maybeSingle()
      : { data: null };
    isPersonalWorkspace =
      workspace?.workspace_type === 'personal' &&
      workspace.owner_auth_user_id === user.auth_user_id;
    const { data: membership } = await supabaseAdmin
      .from('department_members')
      .select('role_in_department, department:departments(id, name)')
      .eq('teacher_id', user.id);
    departments = (membership ?? []).map((row) => ({
      id: (row.department as unknown as { id: string; name: string }).id,
      name: (row.department as unknown as { id: string; name: string }).name,
      role_in_department: row.role_in_department as 'head' | 'member',
    }));
    if (isPersonalWorkspace) {
      departmentPermissions = [...DEPARTMENT_PERMISSION_KEYS];
      managePermissions = [...DEPARTMENT_PERMISSION_KEYS];
    } else if (user.school_id) {
      // View and manage levels combine department grants, staff-type presets,
      // and per-person overrides. Writes are still checked server-side.
      [departmentPermissions, managePermissions] = await Promise.all([
        getDepartmentGrantedPermissions(user.id, user.school_id),
        getEffectiveDepartmentPermissions(user.id, user.school_id),
      ]);
    }
  }

  return NextResponse.json({
    user: {
      ...toPublicUser(user),
      ...(payload.impersonatedBy && {
        must_change_password: false,
        accepted_legal_at: user.accepted_legal_at ?? new Date(0).toISOString(),
        is_school_director: true,
        impersonation: {
          active: true,
          readOnly: true,
          previewAllFeatures: payload.previewAllFeatures === true,
        },
      }),
      departments,
      department_permissions: payload.previewAllFeatures
        ? DEPARTMENT_PERMISSION_KEYS
        : departmentPermissions,
      manage_permissions: payload.previewAllFeatures ? DEPARTMENT_PERMISSION_KEYS : managePermissions,
      is_personal_workspace: isPersonalWorkspace,
      auth_provider: authProvider,
      active_workspace_profile_id: user.id,
      workspaces,
    },
  });
}
