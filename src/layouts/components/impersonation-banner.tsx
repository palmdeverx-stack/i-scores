'use client';

import { useState } from 'react';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

export function ImpersonationBanner() {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user?.impersonation?.active) return null;

  const exitImpersonation = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/impersonation/exit', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'ไม่สามารถกลับสู่ Master Admin ได้');
      window.location.replace(result.redirectUrl);
    } catch (exitError) {
      setError(
        exitError instanceof Error ? exitError.message : 'ไม่สามารถกลับสู่ Master Admin ได้'
      );
      setLoading(false);
    }
  };

  return (
    <Alert
      severity={error ? 'error' : 'warning'}
      variant="filled"
      action={
        <Button color="inherit" size="small" loading={loading} onClick={exitImpersonation}>
          กลับสู่ Master Admin
        </Button>
      }
      sx={{ borderRadius: 0 }}
    >
      {error || 'กำลังเข้าสู่ระบบในนาม — เปิดทุก Feature ในโหมดดูอย่างเดียว'}
    </Alert>
  );
}
