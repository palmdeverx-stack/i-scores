'use client';

import { setSession } from './utils';

// ----------------------------------------------------------------------

export type SignInParams = {
  email: string;
  password: string;
};

export type SignUpParams = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

// ----------------------------------------------------------------------

/**
 * NOTE: mock data — no backend wired up yet.
 * Only the demo credentials shown on the sign-in form are accepted.
 */
const MOCK_CREDENTIALS = { email: 'demo@minimals.cc', password: '@2Minimal' };

function createMockAccessToken(payload: Record<string, unknown>) {
  const toBase64Url = (value: Record<string, unknown>) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_');

  const header = toBase64Url({ alg: 'none', typ: 'JWT' });
  const body = toBase64Url({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 3, // ~3 days
  });

  return `${header}.${body}.mock-signature`;
}

/** **************************************
 * Sign in
 *************************************** */
export const signInWithPassword = async ({ email, password }: SignInParams): Promise<void> => {
  if (email !== MOCK_CREDENTIALS.email || password !== MOCK_CREDENTIALS.password) {
    throw new Error('Incorrect email or password');
  }

  const accessToken = createMockAccessToken({
    sub: 'demo-user',
    email,
    displayName: 'Jaydon Frankie',
    role: 'admin',
  });

  setSession(accessToken);
};

/** **************************************
 * Sign up
 *************************************** */
export const signUp = async ({
  email,
  password,
  firstName,
  lastName,
}: SignUpParams): Promise<void> => {
  const accessToken = createMockAccessToken({
    sub: 'demo-user',
    email,
    displayName: `${firstName} ${lastName}`,
    role: 'admin',
  });

  setSession(accessToken);
};

/** **************************************
 * Sign out
 *************************************** */
export const signOut = async (): Promise<void> => {
  try {
    await setSession(null);
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
};
