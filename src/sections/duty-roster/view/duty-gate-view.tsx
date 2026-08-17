'use client';

import type { IScannerControls } from '@zxing/browser';
import type { GateAction } from '../duty-gate-actions';

import dayjs from 'dayjs';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { toast } from 'src/components/snackbar';
import { RemixIcon } from 'src/components/remix-icon';

import { getDutyGate, scanDutyGate } from '../duty-gate-actions';

export function DutyGateView({ scheduleId }: { scheduleId: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const scanningRef = useRef(false);
  const queryClient = useQueryClient();
  const [action, setAction] = useState<GateAction>('entry');
  const [manualPayload, setManualPayload] = useState('');
  const [cameraError, setCameraError] = useState('');

  const gateQuery = useQuery({
    queryKey: ['duty-gate', scheduleId],
    queryFn: () => getDutyGate(scheduleId),
    refetchInterval: 30_000,
  });
  const scanMutation = useMutation({
    mutationFn: (payload: string) => scanDutyGate(scheduleId, action, payload),
    onSuccess: async (result) => {
      toast.success(
        `${result.action === 'entry' ? 'เข้าโรงเรียน' : 'ออกโรงเรียน'} · ${result.student.first_name ?? ''} ${result.student.last_name ?? ''}`
      );
      navigator.vibrate?.(100);
      setManualPayload('');
      await queryClient.invalidateQueries({ queryKey: ['duty-gate', scheduleId] });
    },
    onError: (error) => {
      toast.error(error.message);
      navigator.vibrate?.([80, 60, 80]);
    },
  });

  const processPayload = useCallback(
    async (payload: string) => {
      if (scanningRef.current || !gateQuery.data?.active) return;
      scanningRef.current = true;
      try {
        await scanMutation.mutateAsync(payload);
      } finally {
        window.setTimeout(() => {
          scanningRef.current = false;
        }, 900);
      }
    },
    [gateQuery.data?.active, scanMutation]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !gateQuery.data?.active) return undefined;
    let disposed = false;
    void import('@zxing/browser')
      .then(async ({ BrowserQRCodeReader }) => {
        if (disposed) return;
        const reader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 250,
          delayBetweenScanSuccess: 1000,
        });
        const controls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: 'environment' } } },
          video,
          (result) => result && void processPayload(result.getText())
        );
        if (disposed) controls.stop();
        else controlsRef.current = controls;
      })
      .catch(() => setCameraError('เปิดกล้องไม่ได้ กรุณาอนุญาตกล้องและใช้ HTTPS/localhost'));
    return () => {
      disposed = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [gateQuery.data?.active, processPayload]);

  if (gateQuery.isLoading)
    return (
      <Box sx={{ py: 12, display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  if (gateQuery.isError || !gateQuery.data)
    return (
      <Container maxWidth={false}>
        <Alert severity="error">{gateQuery.error?.message}</Alert>
      </Container>
    );

  const { duty, active, records, stats } = gateQuery.data;
  return (
    <Container maxWidth={false} sx={{ pb: 5 }}>
      <Typography component="h1" variant="h3">
        ปฏิบัติหน้าที่ครูเวร
      </Typography>
      <Typography sx={{ mt: 1, color: 'text.secondary' }}>
        {dayjs(duty.duty_date).format('DD/MM/YYYY')} · {duty.starts_at.slice(0, 5)}–
        {duty.ends_at.slice(0, 5)} น. · {duty.location}
      </Typography>
      {!active && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          เปิดสแกนได้เฉพาะวันและช่วงเวลาที่ได้รับเวร
        </Alert>
      )}

      <Box
        sx={{ mt: 3, gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' } }}
      >
        <Card variant="outlined" sx={{ p: 2.5 }}>
          <ToggleButtonGroup
            fullWidth
            exclusive
            value={action}
            onChange={(_, value) => value && setAction(value)}
          >
            <ToggleButton value="entry">
              <RemixIcon icon="solar:login-2-bold" sx={{ mr: 1 }} />
              เข้าโรงเรียน
            </ToggleButton>
            <ToggleButton value="exit">
              <RemixIcon icon="solar:logout-2-bold" sx={{ mr: 1 }} />
              ออกโรงเรียน
            </ToggleButton>
          </ToggleButtonGroup>
          {cameraError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {cameraError}
            </Alert>
          )}
          <Box
            component="video"
            ref={videoRef}
            muted
            playsInline
            sx={{
              mt: 2,
              width: 1,
              minHeight: 300,
              borderRadius: 2,
              bgcolor: 'common.black',
              objectFit: 'cover',
            }}
          />
          <Box sx={{ mt: 2, gap: 1, display: 'flex' }}>
            <TextField
              fullWidth
              size="small"
              label="QR หรือรหัสจากเครื่องสแกน"
              value={manualPayload}
              onChange={(event) => setManualPayload(event.target.value)}
              disabled={!active}
            />
            <Button
              variant="contained"
              disabled={!active || !manualPayload.trim()}
              loading={scanMutation.isPending}
              onClick={() => processPayload(manualPayload)}
            >
              บันทึก
            </Button>
          </Box>
        </Card>

        <Box sx={{ gap: 2, display: 'grid', alignContent: 'start' }}>
          <Box sx={{ gap: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {[
              ['เข้าแล้ว', stats.entered],
              ['ออกแล้ว', stats.exited],
              ['มาสาย', stats.late],
            ].map(([label, value]) => (
              <Card key={String(label)} variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4">{value}</Typography>
                <Typography variant="caption">{label}</Typography>
              </Card>
            ))}
          </Box>
          <Card variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6">รายการล่าสุด</Typography>
            <Box sx={{ mt: 1, gap: 1, display: 'grid' }}>
              {records.map((record: any) => {
                const student = Array.isArray(record.student) ? record.student[0] : record.student;
                return (
                  <Box
                    key={record.id}
                    sx={{
                      p: 1,
                      gap: 1,
                      display: 'flex',
                      alignItems: 'center',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Avatar src={student?.avatar_url ?? undefined} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2">
                        {student?.first_name} {student?.last_name}
                      </Typography>
                      <Typography variant="caption">
                        {student?.student_code ?? student?.username}
                      </Typography>
                    </Box>
                    <Typography variant="caption">
                      {record.exited_at
                        ? `ออก ${dayjs(record.exited_at).format('HH:mm')}`
                        : `เข้า ${dayjs(record.entered_at).format('HH:mm')}`}
                    </Typography>
                  </Box>
                );
              })}
              {!records.length && (
                <Typography
                  variant="body2"
                  sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}
                >
                  ยังไม่มีการสแกน
                </Typography>
              )}
            </Box>
          </Card>
        </Box>
      </Box>
    </Container>
  );
}
