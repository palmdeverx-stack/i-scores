import 'server-only';

import type { DepartmentPermissionKey } from './department-permissions-config';

import { supabaseAdmin } from './supabase-admin';
import { isDepartmentPermissionKey } from './department-permissions-config';

// ----------------------------------------------------------------------

async function loadMembership(teacherId: string, schoolId: string) {
  const { data: membership } = await supabaseAdmin
    .from('department_members')
    .select('id, department_id, department:departments!inner(school_id)')
    .eq('teacher_id', teacherId)
    .maybeSingle();

  if (!membership) return null;
  if ((membership.department as unknown as { school_id: string }).school_id !== schoolId) {
    return null;
  }
  return membership;
}

/**
 * Permission keys `teacherId`'s department has switched on — any member of
 * that department can VIEW pages gated by these, regardless of whether they
 * personally were delegated the permission (that's what decides edit rights,
 * see `getEffectiveDepartmentPermissions`).
 */
export async function getDepartmentGrantedPermissions(
  teacherId: string,
  schoolId: string
): Promise<DepartmentPermissionKey[]> {
  const membership = await loadMembership(teacherId, schoolId);
  if (!membership) return [];

  const { data: departmentGrants } = await supabaseAdmin
    .from('department_permissions')
    .select('permission_key')
    .eq('department_id', membership.department_id);

  return (departmentGrants ?? [])
    .map((row) => row.permission_key)
    .filter(isDepartmentPermissionKey);
}

/**
 * Permission keys `teacherId` personally holds — their department must have
 * the permission switched on, AND they personally must be granted it within
 * that department. This is the stricter, edit/manage-level check; use
 * `getDepartmentGrantedPermissions` for read/view access shared by the whole
 * department.
 */
export async function getEffectiveDepartmentPermissions(
  teacherId: string,
  schoolId: string
): Promise<DepartmentPermissionKey[]> {
  const membership = await loadMembership(teacherId, schoolId);
  if (!membership) return [];

  const [{ data: departmentGrants }, { data: memberGrants }] = await Promise.all([
    supabaseAdmin
      .from('department_permissions')
      .select('permission_key')
      .eq('department_id', membership.department_id),
    supabaseAdmin
      .from('department_member_permissions')
      .select('permission_key')
      .eq('member_id', membership.id),
  ]);

  const departmentKeys = new Set((departmentGrants ?? []).map((row) => row.permission_key));

  return (memberGrants ?? [])
    .map((row) => row.permission_key)
    .filter(
      (key): key is DepartmentPermissionKey =>
        departmentKeys.has(key) && isDepartmentPermissionKey(key)
    );
}

export async function hasDepartmentPermission(
  teacherId: string,
  schoolId: string,
  permissionKey: DepartmentPermissionKey
): Promise<boolean> {
  const permissions = await getEffectiveDepartmentPermissions(teacherId, schoolId);
  return permissions.includes(permissionKey);
}

type PermissionCaller = { role: string; sub: string; schoolId: string | null };

/**
 * True if `caller` may VIEW a resource gated by `permissionKey` — the school
 * admin, or any teacher whose department has the permission switched on
 * (doesn't require the teacher to be personally delegated it).
 */
export async function canViewViaPermission(
  caller: PermissionCaller,
  permissionKey: DepartmentPermissionKey
): Promise<boolean> {
  if (caller.role === 'school_admin') return true;
  if (caller.role !== 'teacher' || !caller.schoolId) return false;
  const granted = await getDepartmentGrantedPermissions(caller.sub, caller.schoolId);
  return granted.includes(permissionKey);
}

/**
 * True if `caller` may act as an admin (create/edit/delete) on a resource
 * gated by `permissionKey` — either they're the school admin, or a teacher
 * personally delegated that permission.
 */
export async function canManageViaPermission(
  caller: PermissionCaller,
  permissionKey: DepartmentPermissionKey
): Promise<boolean> {
  if (caller.role === 'school_admin') return true;
  if (caller.role !== 'teacher' || !caller.schoolId) return false;
  return hasDepartmentPermission(caller.sub, caller.schoolId, permissionKey);
}
