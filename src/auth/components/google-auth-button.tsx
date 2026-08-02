'use client';

import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { CONFIG } from 'src/global-config';
import { getSupabaseBrowserClient } from 'src/lib/supabase-browser';

import { getHomePathForRole } from 'src/auth/utils';

// ----------------------------------------------------------------------

export type GoogleAuthIntent = 'sign-in' | 'sign-up';

type GoogleCredentialResponse = { credential?: string };

type GoogleIdentityServices = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          type: 'standard';
          theme: 'outline';
          size: 'large';
          text: 'signin_with' | 'signup_with';
          shape: 'rectangular';
          width: number;
        }
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

let googleScriptPromise: Promise<void> | undefined;

function loadGoogleIdentityServices() {
  if (window.google?.accounts.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    const script = existingScript ?? document.createElement('script');

    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('ไม่สามารถโหลด Google Sign-In ได้')), {
      once: true,
    });

    if (!existingScript) {
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return googleScriptPromise;
}

type GoogleAuthButtonProps = {
  intent: GoogleAuthIntent;
  onError: (message: string) => void;
};

export function GoogleAuthButton({ intent, onError }: GoogleAuthButtonProps) {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const completeGoogleAuth = async ({ credential }: GoogleCredentialResponse) => {
      if (!credential) {
        onError('Google ไม่ได้ส่งข้อมูลยืนยันตัวตนกลับมา');
        return;
      }

      onError('');
      setLoading(true);

      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error: authError } =
          await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: credential,
          });
        if (authError || !data.session) throw authError ?? new Error('ไม่พบ Google session');

        const response = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: data.session.access_token,
            intent,
          }),
        });
        const result = await response.json();
        if (!response.ok) {
          await supabase.auth.signOut();
          throw new Error(result.message ?? 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้');
        }

        if (result.marketplaceOnly) {
          if (!result.redirectUrl) throw new Error('ยังไม่ได้กำหนด URL ของ Marketplace');
          window.location.replace(result.redirectUrl);
          return;
        }
        if (result.requiresPin) {
          const params = new URLSearchParams({
            pinChallengeToken: result.pinChallengeToken,
            pinRole: result.role,
          });
          router.replace(`${paths.auth.jwt.signIn}?${params.toString()}`);
          return;
        }

        router.replace(getHomePathForRole(result.user?.role));
      } catch (googleError) {
        onError(
          googleError instanceof Error
            ? googleError.message
            : 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้'
        );
        setLoading(false);
      }
    };

    const renderGoogleButton = async () => {
      if (!CONFIG.google.clientId) {
        onError('ยังไม่ได้กำหนด NEXT_PUBLIC_GOOGLE_CLIENT_ID');
        return;
      }

      try {
        await loadGoogleIdentityServices();
        if (cancelled || !buttonRef.current || !window.google) return;

        window.google.accounts.id.initialize({
          client_id: CONFIG.google.clientId,
          callback: completeGoogleAuth,
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: intent === 'sign-up' ? 'signup_with' : 'signin_with',
          shape: 'rectangular',
          width: Math.floor(buttonRef.current.getBoundingClientRect().width),
        });
      } catch (scriptError) {
        onError(
          scriptError instanceof Error ? scriptError.message : 'ไม่สามารถโหลด Google Sign-In ได้'
        );
      }
    };

    void renderGoogleButton();

    return () => {
      cancelled = true;
    };
  }, [intent, onError, router]);

  return (
    <Box
      sx={{
        position: 'relative',
        width: 1,
        minHeight: 44,
        pointerEvents: loading ? 'none' : 'auto',
      }}
    >
      <Box ref={buttonRef} sx={{ width: 1, opacity: loading ? 0.45 : 1 }} />
      {loading && (
        <CircularProgress
          size={22}
          sx={{ position: 'absolute', top: '50%', left: '50%', mt: '-11px', ml: '-11px' }}
        />
      )}
    </Box>
  );
}
