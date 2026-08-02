'use client';

import { getSupabaseBrowserClient } from 'src/lib/supabase-browser';

// ----------------------------------------------------------------------

export type SignInParams = {
  username: string;
  password: string;
};

export type PinChallenge = {
  requiresPin: true;
  pinChallengeToken: string;
  role: 'master_admin' | 'school_admin';
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
  accepted_legal_at: string | null;
};

export type SwitchWorkspaceResult =
  | { role: AppUser['role']; requiresPin?: false }
  | {
      requiresPin: true;
      pinChallengeToken: string;
      role: 'master_admin' | 'school_admin';
    };

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
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
}: SignInParams): Promise<AppUser | PinChallenge> => {
  const result = await postJson('/api/auth/sign-in', { username, password });

  if (result.requiresPin) {
    return result as PinChallenge;
  }

  return result.user;
};

export const verifySignInPin = async ({
  pinChallengeToken,
  pin,
}: {
  pinChallengeToken: string;
  pin: string;
}): Promise<AppUser> => {
  const { user } = await postJson('/api/auth/verify-pin', { pinChallengeToken, pin });

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
  await postJson('/api/auth/sign-up', { username, password, email, firstName, lastName });
};

/** **************************************
 * Change password (forced on first login for auto-generated accounts)
 *************************************** */
export const changePassword = async (newPassword: string): Promise<AppUser> => {
  const response = await fetch('/api/auth/change-password', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPassword }),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message ?? 'Failed to change password');
  }

  return json.user;
};

/** **************************************
 * Accept terms of service / privacy policy (forced on first use for every role)
 *************************************** */
export const acceptLegal = async (): Promise<AppUser> => {
  const response = await fetch('/api/auth/accept-legal', {
    method: 'POST',
    credentials: 'include',
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message ?? 'Failed to record acceptance');
  }

  return json.user;
};

/** **************************************
 * Switch the active application workspace
 *************************************** */
export const switchWorkspace = async (profileId: string): Promise<SwitchWorkspaceResult> =>
  postJson('/api/auth/switch-workspace', { profileId });

/** **************************************
 * Sign out
 *************************************** */
export const signOut = async (): Promise<void> => {
  await Promise.allSettled([
    fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' }),
    getSupabaseBrowserClient().auth.signOut({ scope: 'local' }),
  ]);
};
