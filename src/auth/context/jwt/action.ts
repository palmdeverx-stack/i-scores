'use client';

import { setSession, getStoredToken } from './utils';

// ----------------------------------------------------------------------

export type SignInParams = {
  username: string;
  password: string;
};

export type SignUpParams = {
  username: string;
  password: string;
  email?: string;
  firstName: string;
  lastName: string;
};

export type AppUser = {
  id: string;
  username: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: 'master_admin' | 'school_admin' | 'teacher' | 'student';
  school_id: string | null;
  created_at: string;
  must_change_password: boolean;
};

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message ?? 'Request failed');
  }

  return json;
}

/** **************************************
 * Sign in
 *************************************** */
export const signInWithPassword = async ({
  username,
  password,
}: SignInParams): Promise<AppUser> => {
  const { accessToken, user } = await postJson('/api/auth/sign-in', { username, password });

  setSession(accessToken);

  return user;
};

/** **************************************
 * Sign up
 *************************************** */
export const signUp = async ({
  username,
  password,
  email,
  firstName,
  lastName,
}: SignUpParams): Promise<void> => {
  const { accessToken } = await postJson('/api/auth/sign-up', {
    username,
    password,
    email,
    firstName,
    lastName,
  });

  setSession(accessToken);
};

/** **************************************
 * Change password (forced on first login for auto-generated accounts)
 *************************************** */
export const changePassword = async (newPassword: string): Promise<AppUser> => {
  const token = getStoredToken();
  const response = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ newPassword }),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message ?? 'Failed to change password');
  }

  return json.user;
};

/** **************************************
 * Sign out
 *************************************** */
export const signOut = async (): Promise<void> => {
  setSession(null);
};
