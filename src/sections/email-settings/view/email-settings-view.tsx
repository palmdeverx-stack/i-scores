'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { toast } from 'src/components/snackbar';
import { RemixIcon } from 'src/components/remix-icon';

import { getEmailSettings, updateEmailSettings } from '../email-settings-actions';

// ----------------------------------------------------------------------

export function EmailSettingsView() {
  const queryClient = useQueryClient();
  const [fromEmail, setFromEmail] = useState('');

  const settingsQuery = useQuery({
    queryKey: ['master-email-settings'],
    queryFn: getEmailSettings,
  });
  const saveMutation = useMutation({
    mutationFn: updateEmailSettings,
    onSuccess: async (settings) => {
      setFromEmail(settings.resendFromEmail);
      queryClient.setQueryData(['master-email-settings'], settings);
      toast.success('บันทึกอีเมลผู้ส่งแล้ว');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  useEffect(() => {
    if (settingsQuery.data) setFromEmail(settingsQuery.data.resendFromEmail);
  }, [settingsQuery.data]);

  if (settingsQuery.isLoading) {
    return (
      <Box sx={{ py: 12, display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ pb: 7 }}>
      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h3">
          ตั้งค่าการส่งอีเมล
        </Typography>
        <Typography sx={{ mt: 0.75, color: 'text.secondary' }}>
          กำหนดชื่อและอีเมลผู้ส่งสำหรับคำเชิญและอีเมลจากระบบ E-KRU
        </Typography>
      </Box>

      {settingsQuery.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {settingsQuery.error.message}
        </Alert>
      )}

      <Card variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
        <Box sx={{ mb: 3, gap: 2, display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              flexShrink: 0,
              display: 'grid',
              borderRadius: 2,
              color: 'primary.main',
              placeItems: 'center',
              bgcolor: 'primary.lighter',
            }}
          >
            <RemixIcon icon="solar:letter-bold-duotone" width={28} />
          </Box>
          <Box>
            <Typography variant="h6">Resend sender</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              API Key ยังคงเก็บเป็น Environment secret และจะไม่แสดงบนหน้านี้
            </Typography>
          </Box>
        </Box>

        <Alert
          severity={settingsQuery.data?.resendApiKeyConfigured ? 'success' : 'warning'}
          sx={{ mb: 3 }}
        >
          {settingsQuery.data?.resendApiKeyConfigured
            ? 'พบ RESEND_API_KEY แล้ว'
            : 'ยังไม่พบ RESEND_API_KEY ใน Environment'}
        </Alert>

        <TextField
          fullWidth
          label="RESEND_FROM_EMAIL"
          placeholder="E-KRU <invite@notify.example.com>"
          value={fromEmail}
          disabled={saveMutation.isPending}
          helperText="ต้องใช้อีเมลภายใต้โดเมนที่ Verified ใน Resend"
          onChange={(event) => setFromEmail(event.target.value)}
        />

        {settingsQuery.data?.effectiveFromEmail && (
          <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
            ผู้ส่งที่ระบบใช้งานปัจจุบัน: {settingsQuery.data.effectiveFromEmail}
          </Typography>
        )}

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            size="large"
            variant="contained"
            loading={saveMutation.isPending}
            disabled={!fromEmail.trim() || settingsQuery.isError}
            onClick={() => saveMutation.mutate(fromEmail)}
          >
            บันทึกการตั้งค่า
          </Button>
        </Box>
      </Card>
    </Container>
  );
}
