'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  Card,
  Alert,
  Stack,
  Button,
  Dialog,
  Typography,
  DialogTitle,
  DialogActions,
  DialogContent,
} from '@mui/material';

import { getLineLoginMessage } from 'src/lib/line-login-messages';

import { useAuthContext } from 'src/auth/hooks';
import { startLineLogin } from 'src/auth/components/line-login-button';

type LinkStatus = {
  linked: { display_name: string } | null;
  pending: { displayName: string } | null;
  canManage: boolean;
  enabled: boolean;
  username: string;
};
export function TeacherLineLoginCard() {
  const [callbackError, setCallbackError] = useState('');
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('lineLoginError');
    setCallbackError(getLineLoginMessage(code));
  }, []);
  const { user } = useAuthContext();
  const client = useQueryClient();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [unlink, setUnlink] = useState(false);
  const queryKey = ['teacher-line-login', user?.id];
  const query = useQuery<LinkStatus>({
    queryKey,
    queryFn: async () => {
      const response = await fetch('/api/auth/line/link');
      if (!response.ok) throw new Error('โหลดสถานะ LINE Login ไม่สำเร็จ');
      return response.json();
    },
  });
  async function act(action: 'confirm' | 'cancel' | 'unlink') {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/line/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(getLineLoginMessage(data.code) || 'ดำเนินการไม่สำเร็จ');
      setUnlink(false);
      await client.invalidateQueries({ queryKey });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const data = query.data;
  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h6">เข้าสู่ระบบด้วย LINE</Typography>
        <Typography variant="body2">
          เชื่อมกับบัญชีครูเดิมเพื่อเข้าสู่ระบบครั้งถัดไป แยกจาก LINE สำหรับรับแจ้งเตือน
        </Typography>
        {(error || query.error || callbackError) && (
          <Alert severity="error">{error || query.error?.message || callbackError}</Alert>
        )}
        <Typography variant="body2">
          {data?.linked
            ? `เชื่อมแล้ว: ${data.linked.display_name || 'บัญชี LINE'}`
            : 'ยังไม่ได้เชื่อม LINE Login'}
        </Typography>
        {data && !data.canManage && (
          <Alert severity="info">
            เข้าสู่ระบบด้วยรหัสผ่านหรือ Google ของบัญชีครูเดิมเพื่อจัดการการเชื่อม LINE Login
          </Alert>
        )}
        <Button
          variant="outlined"
          disabled={!data?.enabled || !data.canManage || busy}
          onClick={async () => {
            if (data?.linked) {
              setUnlink(true);
              return;
            }
            setBusy(true);
            try {
              await startLineLogin('link');
            } catch (e) {
              setError((e as Error).message);
              setBusy(false);
            }
          }}
        >
          {data?.linked ? 'ยกเลิกเชื่อม LINE Login' : 'เชื่อม LINE Login'}
        </Button>
      </Stack>
      <Dialog
        open={!!data?.pending || unlink}
        onClose={() => {
          if (!busy) {
            if (unlink) setUnlink(false);
            else void act('cancel');
          }
        }}
      >
        <DialogTitle>{unlink ? 'ยกเลิกเชื่อม LINE Login' : 'ยืนยันเชื่อม LINE Login'}</DialogTitle>
        <DialogContent>
          <Typography>
            {unlink
              ? 'เมื่อยกเลิก session ที่เข้าสู่ระบบผ่าน LINE จะสิ้นสุดลง'
              : `เชื่อม LINE ${data?.pending?.displayName || ''} กับบัญชีครู ${data?.username || ''} ใช่หรือไม่`}
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button
            disabled={busy}
            onClick={() => {
              if (unlink) setUnlink(false);
              else void act('cancel');
            }}
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            disabled={busy}
            onClick={() => void act(unlink ? 'unlink' : 'confirm')}
          >
            ยืนยัน
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
