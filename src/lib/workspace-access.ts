/** Client-safe access decisions. Backend routes remain authoritative. */
export type WorkspaceAccessUser = {
  is_active?: boolean;
  role?: string;
  department_permissions?: readonly string[];
  manage_permissions?: readonly string[];
  departments?: readonly { role_in_department: string }[];
  is_school_director?: boolean;
};
export function hasWorkspacePermission(
  user: WorkspaceAccessUser | null | undefined,
  permission: string | undefined,
  access: 'view' | 'manage' = 'view'
) {
  if (!user || user.is_active === false) return false;
  if (user.role === 'school_admin') return true;
  if (user.role !== 'teacher' || !permission) return false;
  if (user.manage_permissions?.includes(permission)) return true;
  return access === 'view' && (user.department_permissions?.includes(permission) ?? false);
}
