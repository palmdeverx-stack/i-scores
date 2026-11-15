'use client';

import { useState } from 'react';
import { RiLineFill } from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';

import Button from '@mui/material/Button';

import { LINE_LOGIN_MESSAGES } from 'src/lib/line-login-messages';

export async function startLineLogin(intent: 'login' | 'link') {
  const response = await fetch('/api/auth/line/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intent }),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(LINE_LOGIN_MESSAGES[data.code] ?? 'ไม่สามารถเชื่อมต่อ LINE ได้');
  window.location.assign(data.authorizationUrl);
}
export function LineLoginButton({ onError }: { onError: (message: string) => void }) {
  const [loading, setLoading] = useState(false);
  const config = useQuery({
    queryKey: ['line-login-config'],
    queryFn: async () => {
      const response = await fetch('/api/auth/line/config');
      if (!response.ok) throw new Error('LINE');
      return response.json();
    },
  });
  return (
    <Button
      sx={{
        mt: 2,
        minHeight: 40,
        borderRadius: '999px',
        borderColor: '#dadce0',
        color: '#3c4043',
        backgroundColor: '#fff',
        fontSize: 14,
        fontWeight: 400,
        px: 5,
        '& .MuiButton-startIcon': { position: 'absolute', left: 12, margin: 0 },
        '&:hover': { borderColor: '#dadce0', backgroundColor: '#f8faff' },
      }}
      startIcon={<RiLineFill size={20} color="#06C755" aria-hidden="true" />}
      fullWidth
      variant="outlined"
      disabled={!config.data?.enabled || loading}
      onClick={async () => {
        setLoading(true);
        try {
          await startLineLogin('login');
        } catch (error) {
          onError((error as Error).message);
          setLoading(false);
        }
      }}
    >
      ลงชื่อเข้าใช้ด้วย LINE
    </Button>
  );
}
