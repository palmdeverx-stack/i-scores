'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
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
      await queryClient.invalidateQueries({ queryKey: ['master-email-settings'] });
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

  const settings = settingsQuery.data;
  const usesGmail = settings?.emailProvider === 'gmail';
  const senderConfigured = usesGmail
    ? Boolean(settings?.effectiveFromEmail)
    : settings?.resendApiKeyConfigured;
  const hasChanges = !usesGmail && fromEmail.trim() !== (settings?.resendFromEmail ?? '');

  return (
    <Container maxWidth="xl" sx={{ pb: { xs: 5, md: 7 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography component="h1" variant="h3">
            ตั้งค่าการส่งอีเมล
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            จัดการผู้ส่งสำหรับคำเชิญและการแจ้งเตือนจากระบบ EKRU
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="inherit"
          loading={settingsQuery.isFetching}
          disabled={saveMutation.isPending}
          onClick={() => settingsQuery.refetch()}
          startIcon={<RemixIcon icon="solar:restart-bold" width={18} />}
        >
          รีเฟรชข้อมูล
        </Button>
      </Stack>

      {settingsQuery.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {settingsQuery.error.message}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 2fr) minmax(0, 1fr)' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        <Stack spacing={3}>
          <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 'none' }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  flexShrink: 0,
                  display: 'grid',
                  borderRadius: 2,
                  color: 'primary.main',
                  placeItems: 'center',
                  bgcolor: 'primary.lighter',
                }}
              >
                <RemixIcon icon="solar:letter-bold-duotone" width={26} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography component="h2" variant="h6">
                  อีเมลผู้ส่ง
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ชื่อและอีเมลที่ผู้รับจะเห็นในกล่องจดหมาย
                </Typography>
              </Box>
            </Stack>
            <Divider />
            <Box
              component="form"
              onSubmit={(event) => {
                event.preventDefault();
                if (
                  hasChanges &&
                  fromEmail.trim() &&
                  !settingsQuery.isError &&
                  !saveMutation.isPending
                )
                  saveMutation.mutate(fromEmail);
              }}
            >
              <Stack spacing={3} sx={{ p: { xs: 2.5, sm: 3 } }}>
                <TextField
                  fullWidth
                  label="ชื่อและอีเมลผู้ส่ง"
                  placeholder="EKRU <invite@notify.example.com>"
                  value={usesGmail ? (settings?.effectiveFromEmail ?? '') : fromEmail}
                  disabled={saveMutation.isPending || settingsQuery.isError}
                  slotProps={{ input: { readOnly: usesGmail } }}
                  helperText={
                    usesGmail
                      ? 'บัญชีผู้ส่งตั้งจาก GMAIL_USER บนเซิร์ฟเวอร์'
                      : 'ใช้โดเมนที่ยืนยันแล้วใน Resend'
                  }
                  onChange={(event) => setFromEmail(event.target.value)}
                />
                {settings?.senderError && <Alert severity="warning">{settings.senderError}</Alert>}
                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'background.neutral' }}>
                  <Typography variant="overline" color="text.secondary">
                    ผู้ส่งที่ใช้งานปัจจุบัน
                  </Typography>
                  <Typography variant="subtitle2" sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>
                    {settings?.effectiveFromEmail || 'ยังไม่ได้กำหนดอีเมลผู้ส่ง'}
                  </Typography>
                </Box>
              </Stack>
              {!usesGmail && (
                <>
                  <Divider />
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    justifyContent="space-between"
                    sx={{ px: { xs: 2.5, sm: 3 }, py: 2 }}
                  >
                    <Typography variant="caption" color="text.secondary" aria-live="polite">
                      {hasChanges ? 'มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก' : 'การตั้งค่าเป็นปัจจุบัน'}
                    </Typography>
                    <Button
                      type="submit"
                      color="primary"
                      variant="contained"
                      loading={saveMutation.isPending}
                      disabled={!fromEmail.trim() || !hasChanges || settingsQuery.isError}
                    >
                      บันทึกการตั้งค่า
                    </Button>
                  </Stack>
                </>
              )}
            </Box>
          </Card>

          {!usesGmail && (
            <Card
              variant="outlined"
              sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3, boxShadow: 'none' }}
            >
              <Typography component="h2" variant="h6">
                การใช้งาน Resend
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>
                ข้อมูลโควตาและจำนวนคำขอที่รายงานโดยผู้ให้บริการ
              </Typography>
              <Box
                sx={{
                  gap: 2,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                }}
              >
                {[
                  {
                    label: 'โควตารายเดือน',
                    value: settings?.resendUsage?.monthlyQuota ?? '—',
                    helper: 'ใช้แล้ว / ขีดจำกัด',
                  },
                  {
                    label: 'โควตารายวัน',
                    value: settings?.resendUsage?.dailyQuota ?? '—',
                    helper: 'ใช้แล้ว / ขีดจำกัด',
                  },
                  {
                    label: 'คำขอ API คงเหลือ',
                    value:
                      settings?.resendUsage?.rateLimitRemaining != null &&
                      settings.resendUsage.rateLimit != null
                        ? `${settings.resendUsage.rateLimitRemaining} / ${settings.resendUsage.rateLimit}`
                        : '—',
                    helper: 'ต่อรอบจำกัดคำขอ',
                  },
                ].map((item) => (
                  <Box
                    key={item.label}
                    sx={{ p: 2, borderRadius: 2, bgcolor: 'background.neutral', minWidth: 0 }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {item.label}
                    </Typography>
                    <Typography variant="h5" sx={{ my: 1, overflowWrap: 'anywhere' }}>
                      {item.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.helper}
                    </Typography>
                  </Box>
                ))}
              </Box>
              {settings?.resendUsageError && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  {settings.resendUsageError}
                </Alert>
              )}
            </Card>
          )}
        </Stack>

        <Stack spacing={3}>
          <Card variant="outlined" sx={{ p: 3, borderRadius: 3, boxShadow: 'none' }}>
            <Typography component="h2" variant="subtitle1" sx={{ mb: 2 }}>
              สถานะบริการ
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Typography variant="body2">{usesGmail ? 'Gmail SMTP' : 'Resend API'}</Typography>
              <Chip
                size="small"
                variant="soft"
                color={!settings ? 'default' : senderConfigured ? 'success' : 'warning'}
                label={
                  !settings ? 'ไม่มีข้อมูล' : senderConfigured ? 'ตั้งค่าแล้ว' : 'ยังไม่ได้ตั้งค่า'
                }
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              {senderConfigured
                ? 'พบค่าตั้งค่าสำหรับส่งอีเมล'
                : usesGmail
                  ? 'กำหนด GMAIL_USER และ GMAIL_APP_PASSWORD บนเซิร์ฟเวอร์'
                  : 'กำหนด RESEND_API_KEY บนเซิร์ฟเวอร์'}
            </Typography>
          </Card>
          {!usesGmail && (
            <Card variant="outlined" sx={{ p: 3, borderRadius: 3, boxShadow: 'none' }}>
              <Typography component="h2" variant="subtitle1" sx={{ mb: 2 }}>
                ก่อนตั้งค่าผู้ส่ง
              </Typography>
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  1. ยืนยันโดเมนสำหรับส่งอีเมลใน Resend ให้เรียบร้อย
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  2. ระบุชื่อและอีเมล เช่น EKRU &lt;invite@notify.example.com&gt;
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  3. บันทึกเพื่อใช้กับคำเชิญและอีเมลฉบับถัดไป
                </Typography>
              </Stack>
            </Card>
          )}
        </Stack>
      </Box>
    </Container>
  );
}
