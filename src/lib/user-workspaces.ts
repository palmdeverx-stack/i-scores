import 'server-only';

import { supabaseAdmin } from './supabase-admin';

// ----------------------------------------------------------------------

type WorkspaceSchool = {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
  workspace_type: 'school' | 'personal';
  owner_auth_user_id: string | null;
  is_active: boolean;
};

type WorkspaceProfile = {
  id: string;
  role: 'master_admin' | 'school_admin' | 'teacher' | 'student';
  school_id: string | null;
  school: WorkspaceSchool | WorkspaceSchool[] | null;
};

export type UserWorkspace = {
  profile_id: string;
  school_id: string;
  name: string;
  code: string;
  logo_url: string | null;
  workspace_type: 'school' | 'personal';
  role: WorkspaceProfile['role'];
};

function singleSchool(value: WorkspaceProfile['school']) {
  return Array.isArray(value) ? value[0] : value;
}

export async function listUserWorkspaces(authUserId: string): Promise<UserWorkspace[]> {
  const { data, error } = await supabaseAdmin
    .from('app_users')
    .select(
      `id, role, school_id,
       school:schools!app_users_school_id_fkey(
         id, name, code, logo_url, workspace_type, owner_auth_user_id, is_active
       )`
    )
    .eq('auth_user_id', authUserId)
    .eq('is_active', true);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as WorkspaceProfile[])
    .flatMap((profile) => {
      const school = singleSchool(profile.school);
      if (!profile.school_id || !school?.is_active) return [];
      if (school.workspace_type === 'personal' && school.owner_auth_user_id !== authUserId) {
        return [];
      }
      return [
        {
          profile_id: profile.id,
          school_id: profile.school_id,
          name: school.workspace_type === 'personal' ? 'พื้นที่ส่วนตัว' : school.name,
          code: school.code,
          logo_url: school.logo_url,
          workspace_type: school.workspace_type,
          role: profile.role,
        },
      ];
    })
    .sort((left, right) => {
      if (left.workspace_type !== right.workspace_type) {
        return left.workspace_type === 'personal' ? -1 : 1;
      }
      return left.name.localeCompare(right.name, 'th');
    });
}

export async function getWorkspaceProfile(profileId: string, authUserId: string) {
  const { data, error } = await supabaseAdmin
    .from('app_users')
    .select(
      `*, school:schools!app_users_school_id_fkey(
        id, name, code, logo_url, workspace_type, owner_auth_user_id, is_active
      )`
    )
    .eq('id', profileId)
    .eq('auth_user_id', authUserId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const school = singleSchool(data.school as WorkspaceProfile['school']);
  if (!data.school_id || !school?.is_active) return null;
  if (school.workspace_type === 'personal' && school.owner_auth_user_id !== authUserId) {
    return null;
  }
  return { ...data, school };
}
