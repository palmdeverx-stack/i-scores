'use client';

import { getStoredToken } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type UserRole = 'master_admin' | 'school_admin' | 'teacher' | 'student';

export type UserRow = {
  id: string;
  username: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  school_id: string | null;
  school: { name: string } | null;
  created_at: string;
  must_change_password?: boolean;
  login_password?: string | null;
};

export type CreateUserParams = {
  username: string;
  email?: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  schoolId?: string;
};

function authHeader() {
  return { Authorization: `Bearer ${getStoredToken()}` };
}

/** **************************************
 * List users — school admin sees their own school, master admin sees
 * school admins (or pass `role` to filter, e.g. for select dropdowns)
 *************************************** */
export async function listUsers(role?: UserRole): Promise<UserRow[]> {
  const url = role ? `/api/admin/users?role=${role}` : '/api/admin/users';
  const response = await fetch(url, { headers: authHeader() });
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message ?? 'Failed to load users');
  }

  return json.users;
}

/** **************************************
 * Create user
 *************************************** */
export async function createUser(params: CreateUserParams) {
  const response = await fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(params),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message ?? 'Failed to create user');
  }

  return json.user;
}
