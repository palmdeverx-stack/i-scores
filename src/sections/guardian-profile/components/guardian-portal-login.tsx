'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

import { verifyGuardianPortalOtp, requestGuardianPortalOtp } from '../guardian-profile-actions';

// ----------------------------------------------------------------------

type Props = {
  onAuthenticated: () => void;
};

export function GuardianPortalLogin({ onAuthenticated }: Props) {
  const [studentCode, setStudentCode] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'student-code' | 'otp'>('student-code');

  const requestMutation = useMutation({
    mutationFn: () => requestGuardianPortalOtp(studentCode),
    onSuccess: () => {
      setOtp('');
      setStep('otp');
    },
  });
  const verifyMutation = useMutation({
    mutationFn: () => verifyGuardianPortalOtp(studentCode, otp),
    onSuccess: onAuthenticated,
  });
  const error = requestMutation.error ?? verifyMutation.error;

  const submitStudentCode = () => {
    if (studentCode.trim()) requestMutation.mutate();
  };
  const submitOtp = () => {
    if (/^\d{6}$/.test(otp)) verifyMutation.mutate();
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 } }}>
      <Card sx={{ overflow: 'hidden', borderRadius: 3 }}>
        <Box
          sx={{
            px: { xs: 2.5, sm: 4 },
            py: 4,
            color: 'common.white',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #123A72 0%, #1976D2 100%)',
          }}
        >
          <Avatar
            sx={{
              mx: 'auto',
              mb: 2,
              width: 64,
              height: 64,
              color: 'primary.main',
              bgcolor: 'common.white',
            }}
          >
            <Iconify icon="solar:shield-check-bold" width={34} />
          </Avatar>
          <Typography component="h1" variant="h4">
            Parent Portal
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.75, opacity: 0.8 }}>
            ดูโปรไฟล์และประวัติการเข้าเรียนของบุตรหลาน
          </Typography>
        </Box>

        <Box sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6">
              {step === 'student-code' ? 'กรอกรหัสนักเรียน' : 'ยืนยัน OTP ทาง LINE'}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
              {step === 'student-code'
                ? 'ใช้รหัสนักเรียนหรือชื่อผู้ใช้นักเรียนที่เชื่อมกับบัญชี LINE นี้'
                : `ส่ง OTP 6 หลักไปยัง LINE แล้ว สำหรับรหัส ${studentCode}`}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error.message}
            </Alert>
          )}

          {step === 'student-code' ? (
            <TextField
              autoFocus
              fullWidth
              label="รหัสนักเรียน"
              placeholder="กรอกรหัสนักเรียน"
              value={studentCode}
              disabled={requestMutation.isPending}
              onChange={(event) => setStudentCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitStudentCode();
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="solar:user-id-bold" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          ) : (
            <TextField
              autoFocus
              fullWidth
              label="OTP 6 หลัก"
              placeholder="000000"
              value={otp}
              disabled={verifyMutation.isPending}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitOtp();
              }}
              slotProps={{
                htmlInput: {
                  inputMode: 'numeric',
                  autoComplete: 'one-time-code',
                  maxLength: 6,
                  style: { textAlign: 'center', letterSpacing: '0.5em', fontSize: 22 },
                },
              }}
            />
          )}

          <Button
            fullWidth
            size="large"
            variant="contained"
            loading={requestMutation.isPending || verifyMutation.isPending}
            disabled={step === 'student-code' ? !studentCode.trim() : !/^\d{6}$/.test(otp)}
            onClick={step === 'student-code' ? submitStudentCode : submitOtp}
            sx={{ mt: 2 }}
          >
            {step === 'student-code' ? 'ส่ง OTP ไปยัง LINE' : 'เข้าสู่ Parent Portal'}
          </Button>

          {step === 'otp' && (
            <Box
              sx={{
                gap: 1,
                mt: 1,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <Button
                size="small"
                color="inherit"
                onClick={() => {
                  setStep('student-code');
                  verifyMutation.reset();
                }}
              >
                เปลี่ยนรหัสนักเรียน
              </Button>
              <Button
                size="small"
                color="primary"
                disabled={requestMutation.isPending}
                onClick={() => requestMutation.mutate()}
              >
                ส่ง OTP อีกครั้ง
              </Button>
            </Box>
          )}

          <Alert severity="info" variant="outlined" sx={{ mt: 3 }}>
            ต้องเปิดหน้านี้จากลิงก์ที่โรงเรียนส่งให้ทาง LINE ผู้ปกครอง
          </Alert>
        </Box>
      </Card>
    </Container>
  );
}
