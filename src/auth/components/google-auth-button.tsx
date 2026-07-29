'use client';

import { useState } from 'react';

import Button from '@mui/material/Button';

import { getSupabaseBrowserClient } from 'src/lib/supabase-browser';

import { RiGoogleFill } from 'src/components/remix-icon';

// ----------------------------------------------------------------------

export type GoogleAuthIntent = 'sign-in' | 'sign-up';

export function GoogleAuthButton({ intent }: { intent: GoogleAuthIntent }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);

    const callbackUrl = new URL('/auth/google/callback', window.location.origin);
    callbackUrl.searchParams.set('intent', intent);
    const { error: oauthError } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl.toString(),
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        fullWidth
        size="large"
        variant="outlined"
        loading={loading}
        startIcon={<RiGoogleFill />}
        onClick={handleGoogleAuth}
        sx={{ py: 1.25, bgcolor: 'background.paper' }}
      >
        {intent === 'sign-up' ? 'สมัคร Marketplace ด้วย Google' : 'เข้าสู่ระบบด้วย Google'}
      </Button>
      {error && (
        <Button disabled size="small" sx={{ justifyContent: 'flex-start', color: 'error.main' }}>
          {error}
        </Button>
      )}
    </>
  );
}

