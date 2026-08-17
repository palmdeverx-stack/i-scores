'use client';

import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { RemixIcon } from 'src/components/remix-icon';

import { useAuthContext } from 'src/auth/hooks';

import { WorkAttendanceQrDialog } from '../components/work-attendance-qr-dialog';
import { clockWork, getWorkAttendance, saveWorkAttendanceConfig } from '../work-attendance-actions';

// ----------------------------------------------------------------------

function currentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!window.isSecureContext) {
      reject(new Error('การอ่านตำแหน่งต้องเปิดผ่าน HTTPS หรือ localhost เท่านั้น'));
      return;
    }
    if (!navigator.geolocation) {
      reject(new Error('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 0,
    });
  });
}

function geolocationErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = Number(error.code);
    if (code === 1) {
      return 'ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง กรุณากดไอคอนด้านซ้ายของ URL แล้วอนุญาต Location จากนั้นลองใหม่';
    }
    if (code === 2) {
      return 'ไม่พบตำแหน่งปัจจุบัน กรุณาเปิด Location Services/GPS และตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
    }
    if (code === 3) {
      return 'ค้นหาตำแหน่งไม่สำเร็จภายในเวลาที่กำหนด กรุณาออกไปยังบริเวณที่รับสัญญาณ GPS แล้วลองใหม่';
    }
  }
  return error instanceof Error ? error.message : 'ไม่สามารถอ่านตำแหน่งได้';
}

export function WorkAttendanceView() {
  const { user } = useAuthContext();
  const isAdmin = user?.role === 'school_admin';
  const queryClient = useQueryClient();
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radiusMeters, setRadiusMeters] = useState('150');
  const [requireDailyQr, setRequireDailyQr] = useState(false);
  const [qrRotationMinutes, setQrRotationMinutes] = useState('5');
  const [locationError, setLocationError] = useState('');
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrImage, setQrImage] = useState('');
  const [fullQrOpen, setFullQrOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [qrCountdown, setQrCountdown] = useState('');

  const attendanceQuery = useQuery({
    queryKey: ['work-attendance', user?.school_id, user?.id],
    queryFn: getWorkAttendance,
    enabled: !!user?.school_id && !!user?.id,
  });

  useEffect(() => {
    const config = attendanceQuery.data?.config;
    if (!config) return;
    setLatitude(config.latitude === null ? '' : String(config.latitude));
    setLongitude(config.longitude === null ? '' : String(config.longitude));
    setRadiusMeters(String(config.radiusMeters));
    setRequireDailyQr(config.requireDailyQr);
    setQrRotationMinutes(String(config.qrRotationMinutes));
  }, [attendanceQuery.data?.config]);

  useEffect(() => {
    if (!isAdmin || !attendanceQuery.data?.nextQrRotationAt) return undefined;
    const delay = Math.max(
      250,
      new Date(attendanceQuery.data.nextQrRotationAt).getTime() - Date.now() + 250
    );
    const timeout = window.setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: ['work-attendance'] });
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [attendanceQuery.data?.nextQrRotationAt, isAdmin, queryClient]);

  useEffect(() => {
    const payload = attendanceQuery.data?.dailyQrPayload;
    if (!payload) {
      setQrImage('');
      return undefined;
    }
    let active = true;
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(payload, { width: 360, margin: 2 }))
      .then((image) => {
        if (active) setQrImage(image);
      });
    return () => {
      active = false;
    };
  }, [attendanceQuery.data?.dailyQrPayload]);

  useEffect(() => {
    if (!fullQrOpen) return undefined;
    const updateClock = () => {
      const now = dayjs();
      setCurrentDateTime(now.format('DD/MM/YYYY HH:mm:ss'));
      const nextRotation = attendanceQuery.data?.nextQrRotationAt;
      if (nextRotation) {
        const seconds = Math.max(0, dayjs(nextRotation).diff(now, 'second'));
        setQrCountdown(
          `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
        );
      }
    };
    updateClock();
    const interval = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(interval);
  }, [attendanceQuery.data?.nextQrRotationAt, fullQrOpen]);

  const clockMutation = useMutation({
    mutationFn: async (qrPayload?: string) => {
      setLocationError('');
      const position = await currentPosition();
      return clockWork(position.coords.latitude, position.coords.longitude, qrPayload);
    },
    onSuccess: (result) => {
      setQrDialogOpen(false);
      toast.success(
        result.action === 'check_in'
          ? `ลงเวลาเข้างานสำเร็จ · อยู่ห่างจุดลงเวลา ${result.distance} เมตร`
          : `ลงเวลาออกงานสำเร็จ · อยู่ห่างจุดลงเวลา ${result.distance} เมตร`
      );
      return queryClient.invalidateQueries({ queryKey: ['work-attendance'] });
    },
    onError: (error) => setLocationError(geolocationErrorMessage(error)),
  });

  const configMutation = useMutation({
    mutationFn: () =>
      saveWorkAttendanceConfig({
        latitude: Number(latitude),
        longitude: Number(longitude),
        radiusMeters: Number(radiusMeters),
        requireDailyQr,
        qrRotationMinutes: Number(qrRotationMinutes),
      }),
    onSuccess: () => {
      toast.success('บันทึกการตั้งค่าพื้นที่ลงเวลาสำเร็จ');
      return queryClient.invalidateQueries({ queryKey: ['work-attendance'] });
    },
  });

  const handleUseCurrentLocation = async () => {
    setLocationError('');
    try {
      const position = await currentPosition();
      setLatitude(String(position.coords.latitude));
      setLongitude(String(position.coords.longitude));
    } catch (error) {
      setLocationError(geolocationErrorMessage(error));
    }
  };

  const openFullQr = async () => {
    setFullQrOpen(true);
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      // The full-screen dialog remains available if the browser blocks native fullscreen.
    }
  };

  const closeFullQr = async () => {
    setFullQrOpen(false);
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
  };

  const todayRecord = attendanceQuery.data?.todayRecord;
  const clockCompleted = !!todayRecord?.checked_out_at;

  return (
    <Container maxWidth={false} sx={{ pb: 5 }}>
      <Box sx={{ mb: 3 }}>
        <Typography component="h1" variant="h3">
          {isAdmin ? 'เวลาปฏิบัติงานบุคลากร' : 'ลงเวลาปฏิบัติงาน'}
        </Typography>
        <Typography sx={{ mt: 1, color: 'text.secondary' }}>
          {isAdmin
            ? 'กำหนดพื้นที่ลงเวลาและตรวจสอบเวลาเข้า–ออกงานของครู'
            : 'เปิดตำแหน่งที่ตั้งและลงเวลาเมื่ออยู่ภายในพื้นที่โรงเรียน'}
        </Typography>
      </Box>

      {(attendanceQuery.isError ||
        locationError ||
        clockMutation.error ||
        configMutation.error) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {locationError ||
            clockMutation.error?.message ||
            configMutation.error?.message ||
            attendanceQuery.error?.message}
        </Alert>
      )}

      {isAdmin ? (
        <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6">พื้นที่อนุญาตให้ลงเวลา</Typography>
          <Typography variant="body2" sx={{ mt: 0.5, mb: 2.5, color: 'text.secondary' }}>
            ครูต้องอยู่ภายในรัศมีที่กำหนด ระบบจึงจะบันทึกเวลาได้
          </Typography>
          <Box
            sx={{
              gap: 2,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 180px' },
            }}
          >
            <TextField
              label="ละติจูด"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
            />
            <TextField
              label="ลองจิจูด"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
            />
            <TextField
              label="รัศมี (เมตร)"
              type="number"
              value={radiusMeters}
              onChange={(event) => setRadiusMeters(event.target.value)}
            />
          </Box>
          <FormControlLabel
            sx={{ mt: 2 }}
            control={
              <Switch
                checked={requireDailyQr}
                onChange={(event) => setRequireDailyQr(event.target.checked)}
              />
            }
            label="บังคับสแกน QR ประจำวันร่วมกับ GPS"
          />
          {requireDailyQr && (
            <TextField
              label="เปลี่ยน QR ทุก (นาที)"
              type="number"
              value={qrRotationMinutes}
              onChange={(event) => setQrRotationMinutes(event.target.value)}
              // slotProps={{ htmlInput: { min: 1, max: 5, step: 1 } }}
              helperText="กำหนดได้ 1–60 นาที เมื่อหมดเวลา QR เดิมจะใช้ไม่ได้ทันที"
              sx={{ mt: 2, display: 'block', maxWidth: 300 }}
            />
          )}
          {requireDailyQr && !attendanceQuery.data?.config.requireDailyQr && (
            <Alert severity="info" sx={{ mt: 1 }}>
              กด “บันทึกการตั้งค่าและสร้าง QR” เพื่อเปิดใช้งานและแสดง QR ประจำวันนี้
            </Alert>
          )}
          <Box sx={{ gap: 1, mt: 2, display: 'flex', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={() => void handleUseCurrentLocation()}
              startIcon={<RemixIcon icon="solar:map-point-bold" />}
            >
              ใช้ตำแหน่งปัจจุบัน
            </Button>
            <Button
              variant="contained"
              loading={configMutation.isPending}
              disabled={!latitude || !longitude}
              onClick={() => configMutation.mutate()}
            >
              {requireDailyQr ? 'บันทึกการตั้งค่าและสร้าง QR' : 'บันทึกการตั้งค่า'}
            </Button>
          </Box>
          {requireDailyQr && attendanceQuery.data?.config.requireDailyQr && qrImage && (
            <Box
              sx={{
                mt: 3,
                p: 2.5,
                textAlign: 'center',
                borderRadius: 2,
                bgcolor: 'background.neutral',
              }}
            >
              <Typography variant="h6">QR ลงเวลาประจำวันนี้</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                เปลี่ยนอัตโนมัติทุก {attendanceQuery.data.config.qrRotationMinutes} นาที QR
                เดิมจะหมดอายุทันที
              </Typography>
              <Box
                component="img"
                src={qrImage}
                alt="QR ลงเวลาประจำวัน"
                sx={{ width: 280, maxWidth: 1, mt: 2 }}
              />
              <Box>
                <Button
                  variant="outlined"
                  onClick={() => void openFullQr()}
                  startIcon={<RemixIcon icon="solar:maximize-square-3-bold" />}
                >
                  เปิด QR เต็มหน้าจอ
                </Button>
              </Box>
            </Box>
          )}
        </Card>
      ) : (
        <Card variant="outlined" sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <RemixIcon icon="solar:map-point-bold" width={52} sx={{ color: 'primary.main' }} />
          <Typography variant="h5" sx={{ mt: 1 }}>
            วันนี้ {dayjs().format('DD/MM/YYYY')}
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            {!attendanceQuery.data?.config.configured
              ? 'โรงเรียนยังไม่ได้ตั้งค่าพื้นที่ลงเวลา'
              : clockCompleted
                ? 'ลงเวลาเข้าและออกงานวันนี้ครบแล้ว'
                : todayRecord
                  ? `เข้างาน ${dayjs(todayRecord.checked_in_at).format('HH:mm')} น. กรุณาลงเวลาออกงานเมื่อเลิกงาน`
                  : 'ระบบจะขอพิกัดปัจจุบันเพื่อตรวจสอบว่าคุณอยู่ในพื้นที่โรงเรียน'}
          </Typography>
          <Button
            size="large"
            variant="contained"
            color={todayRecord ? 'warning' : 'primary'}
            loading={clockMutation.isPending}
            disabled={!attendanceQuery.data?.config.configured || clockCompleted}
            onClick={() => {
              if (attendanceQuery.data?.config.requireDailyQr) setQrDialogOpen(true);
              else clockMutation.mutate(undefined);
            }}
            startIcon={
              <RemixIcon icon={todayRecord ? 'solar:logout-2-bold' : 'solar:login-2-bold'} />
            }
            sx={{ mt: 3 }}
          >
            {todayRecord ? 'ลงเวลาออกงาน' : 'ลงเวลาเข้างาน'}
          </Button>
        </Card>
      )}

      <Card variant="outlined">
        <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">ประวัติการลงเวลา</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {isAdmin && <TableCell>บุคลากร</TableCell>}
                <TableCell>วันที่</TableCell>
                <TableCell>เข้างาน</TableCell>
                <TableCell>ออกงาน</TableCell>
                <TableCell>สถานะ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(attendanceQuery.data?.records ?? []).map((record) => {
                const name =
                  `${record.staff.first_name ?? ''} ${record.staff.last_name ?? ''}`.trim() ||
                  record.staff.username;
                return (
                  <TableRow key={record.id} hover>
                    {isAdmin && (
                      <TableCell>
                        <Box sx={{ gap: 1, display: 'flex', alignItems: 'center' }}>
                          <Avatar
                            src={record.staff.avatar_url ?? undefined}
                            sx={{ width: 32, height: 32 }}
                          >
                            {name.charAt(0)}
                          </Avatar>
                          <Typography variant="subtitle2">{name}</Typography>
                        </Box>
                      </TableCell>
                    )}
                    <TableCell>{dayjs(record.work_date).format('DD/MM/YYYY')}</TableCell>
                    <TableCell>{dayjs(record.checked_in_at).format('HH:mm')} น.</TableCell>
                    <TableCell>
                      {record.checked_out_at
                        ? `${dayjs(record.checked_out_at).format('HH:mm')} น.`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Label color={record.checked_out_at ? 'success' : 'warning'} variant="soft">
                        {record.checked_out_at ? 'ครบถ้วน' : 'ยังไม่ออกงาน'}
                      </Label>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!attendanceQuery.isLoading && !attendanceQuery.data?.records.length && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} align="center" sx={{ py: 7 }}>
                    ยังไม่มีประวัติการลงเวลา
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {!isAdmin && (
        <WorkAttendanceQrDialog
          open={qrDialogOpen}
          pending={clockMutation.isPending}
          onClose={() => setQrDialogOpen(false)}
          onScan={(payload) => clockMutation.mutate(payload)}
        />
      )}

      <Dialog fullScreen open={fullQrOpen} onClose={() => void closeFullQr()}>
        <Box
          sx={{
            p: { xs: 2, sm: 4 },
            minHeight: '100dvh',
            display: 'flex',
            textAlign: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            justifyContent: 'center',
            bgcolor: 'common.white',
          }}
        >
          <Button
            color="inherit"
            onClick={() => void closeFullQr()}
            startIcon={<RemixIcon icon="mingcute:close-line" />}
            sx={{ position: 'absolute', top: 20, right: 20 }}
          >
            ปิด
          </Button>
          <Typography variant="h3">QR ลงเวลาปฏิบัติงาน</Typography>
          <Typography
            variant="h4"
            sx={{ mt: 1.5, color: 'primary.main', fontVariantNumeric: 'tabular-nums' }}
          >
            {currentDateTime}
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            สแกน QR นี้ แล้วระบบจะตรวจสอบตำแหน่ง GPS ก่อนบันทึกเวลา
          </Typography>
          {qrCountdown && (
            <Typography
              variant="h5"
              sx={{ mt: 1, color: 'warning.dark', fontVariantNumeric: 'tabular-nums' }}
            >
              QR ใหม่ใน {qrCountdown}
            </Typography>
          )}
          {qrImage && (
            <Box
              component="img"
              src={qrImage}
              alt="QR ลงเวลาประจำวันแบบเต็มหน้าจอ"
              sx={{ width: { xs: 'min(82vw, 480px)', md: 'min(64vh, 620px)' }, mt: 2 }}
            />
          )}
          <Label color="success" variant="soft" sx={{ mt: 1 }}>
            QR เปลี่ยนทุก {attendanceQuery.data?.config.qrRotationMinutes ?? 5} นาที
          </Label>
        </Box>
      </Dialog>
    </Container>
  );
}
