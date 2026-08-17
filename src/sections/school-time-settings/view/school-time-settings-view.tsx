'use client';

import type { SchoolPeriod, SchoolPeriodType } from '../school-time-settings-actions';

import * as z from 'zod';
import dayjs from 'dayjs';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { RemixIcon } from 'src/components/remix-icon';
import { Form, Field } from 'src/components/hook-form';

import {
  createSchoolPeriod,
  deleteSchoolPeriod,
  updateSchoolPeriod,
  getSchoolTimeSettings,
  saveSchoolTimeSettings,
} from '../school-time-settings-actions';

const DAY_OPTIONS = [
  { label: 'อาทิตย์', value: '0' },
  { label: 'จันทร์', value: '1' },
  { label: 'อังคาร', value: '2' },
  { label: 'พุธ', value: '3' },
  { label: 'พฤหัสบดี', value: '4' },
  { label: 'ศุกร์', value: '5' },
  { label: 'เสาร์', value: '6' },
];

const PERIOD_TYPE_LABEL: Record<SchoolPeriodType, string> = {
  class: 'คาบเรียน',
  assembly: 'เข้าแถว',
  break: 'พัก',
  lunch: 'พักกลางวัน',
  activity: 'กิจกรรม',
};

const validTime = (value: string) => dayjs(value).isValid();
const timeValue = (value: string) => dayjs(`2000-01-01T${value}`).format();

const SettingsSchema = z
  .object({
    activeWeekdays: z.array(z.string()).min(1, 'กรุณาเลือกวันเปิดเรียนอย่างน้อย 1 วัน'),
    arrivalOpenTime: z.string().refine(validTime, 'กรุณาเลือกเวลาเปิดรับนักเรียน'),
    schoolStartTime: z.string().refine(validTime, 'กรุณาเลือกเวลาเข้าเรียน'),
    lateAfterTime: z.string().refine(validTime, 'กรุณาเลือกเวลาเริ่มนับสาย'),
    schoolEndTime: z.string().refine(validTime, 'กรุณาเลือกเวลาเลิกเรียน'),
    departureCloseTime: z.string().refine(validTime, 'กรุณาเลือกเวลาปิดรับการสแกนออก'),
  })
  .superRefine((values, context) => {
    const times = [
      values.arrivalOpenTime,
      values.schoolStartTime,
      values.lateAfterTime,
      values.schoolEndTime,
      values.departureCloseTime,
    ];
    if (times.every(validTime)) {
      const formatted = times.map((time) => dayjs(time).format('HH:mm'));
      if (
        formatted[0]! > formatted[1]! ||
        formatted[1]! > formatted[2]! ||
        formatted[2]! >= formatted[3]! ||
        formatted[3]! > formatted[4]!
      ) {
        context.addIssue({
          code: 'custom',
          path: ['departureCloseTime'],
          message: 'กรุณาเรียงเวลาตั้งแต่เปิดรับนักเรียนจนถึงปิดการสแกนออก',
        });
      }
    }
  });

const PeriodSchema = z
  .object({
    periodNumber: z.number().int().min(1).max(99),
    name: z.string().trim().min(1, 'กรุณาระบุชื่อคาบ').max(120),
    periodType: z.enum(['class', 'assembly', 'break', 'lunch', 'activity']),
    startsAt: z.string().refine(validTime, 'กรุณาเลือกเวลาเริ่ม'),
    endsAt: z.string().refine(validTime, 'กรุณาเลือกเวลาสิ้นสุด'),
    ringAtStart: z.boolean(),
    ringAtEnd: z.boolean(),
    isActive: z.boolean(),
  })
  .superRefine((values, context) => {
    if (
      validTime(values.startsAt) &&
      validTime(values.endsAt) &&
      dayjs(values.endsAt).format('HH:mm') <= dayjs(values.startsAt).format('HH:mm')
    ) {
      context.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม',
      });
    }
  });

type SettingsFormValues = z.infer<typeof SettingsSchema>;
type PeriodFormValues = z.infer<typeof PeriodSchema>;

const SETTINGS_DEFAULTS: SettingsFormValues = {
  activeWeekdays: ['1', '2', '3', '4', '5'],
  arrivalOpenTime: timeValue('06:00'),
  schoolStartTime: timeValue('08:00'),
  lateAfterTime: timeValue('08:00'),
  schoolEndTime: timeValue('16:00'),
  departureCloseTime: timeValue('18:00'),
};

const PERIOD_DEFAULTS: PeriodFormValues = {
  periodNumber: 1,
  name: 'คาบที่ 1',
  periodType: 'class',
  startsAt: timeValue('08:30'),
  endsAt: timeValue('09:20'),
  ringAtStart: true,
  ringAtEnd: true,
  isActive: true,
};

export function SchoolTimeSettingsView() {
  const queryClient = useQueryClient();
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<SchoolPeriod | null>(null);
  const [deletingPeriod, setDeletingPeriod] = useState<SchoolPeriod | null>(null);
  const settingsMethods = useForm<SettingsFormValues>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: SETTINGS_DEFAULTS,
  });
  const periodMethods = useForm<PeriodFormValues>({
    resolver: zodResolver(PeriodSchema),
    defaultValues: PERIOD_DEFAULTS,
  });

  const settingsQuery = useQuery({
    queryKey: ['school-time-settings'],
    queryFn: getSchoolTimeSettings,
  });

  useEffect(() => {
    const settings = settingsQuery.data?.settings;
    if (!settings) return;
    settingsMethods.reset({
      activeWeekdays: settings.active_weekdays.map(String),
      arrivalOpenTime: timeValue(settings.arrival_open_time),
      schoolStartTime: timeValue(settings.school_start_time),
      lateAfterTime: timeValue(settings.late_after_time),
      schoolEndTime: timeValue(settings.school_end_time),
      departureCloseTime: timeValue(settings.departure_close_time),
    });
  }, [settingsMethods, settingsQuery.data?.settings]);

  const settingsMutation = useMutation({
    mutationFn: (values: SettingsFormValues) =>
      saveSchoolTimeSettings({
        activeWeekdays: values.activeWeekdays.map(Number),
        arrivalOpenTime: dayjs(values.arrivalOpenTime).format('HH:mm'),
        schoolStartTime: dayjs(values.schoolStartTime).format('HH:mm'),
        lateAfterTime: dayjs(values.lateAfterTime).format('HH:mm'),
        schoolEndTime: dayjs(values.schoolEndTime).format('HH:mm'),
        departureCloseTime: dayjs(values.departureCloseTime).format('HH:mm'),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['school-time-settings'] });
      toast.success('บันทึกวันและเวลาเรียนสำเร็จ');
    },
  });

  const periodMutation = useMutation({
    mutationFn: (values: PeriodFormValues) => {
      const input = {
        ...values,
        name: values.name.trim(),
        startsAt: dayjs(values.startsAt).format('HH:mm'),
        endsAt: dayjs(values.endsAt).format('HH:mm'),
      };
      return editingPeriod
        ? updateSchoolPeriod(editingPeriod.id, input)
        : createSchoolPeriod(input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['school-time-settings'] });
      toast.success(editingPeriod ? 'แก้ไขช่วงคาบสำเร็จ' : 'เพิ่มช่วงคาบสำเร็จ');
      setPeriodDialogOpen(false);
      setEditingPeriod(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSchoolPeriod,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['school-time-settings'] });
      toast.success('ลบช่วงคาบสำเร็จ');
      setDeletingPeriod(null);
    },
  });

  const openCreatePeriod = () => {
    const nextNumber =
      Math.max(0, ...(settingsQuery.data?.periods ?? []).map((item) => item.period_number)) + 1;
    setEditingPeriod(null);
    periodMethods.reset({
      ...PERIOD_DEFAULTS,
      periodNumber: nextNumber,
      name: `คาบที่ ${nextNumber}`,
    });
    periodMutation.reset();
    setPeriodDialogOpen(true);
  };

  const openEditPeriod = (period: SchoolPeriod) => {
    setEditingPeriod(period);
    periodMethods.reset({
      periodNumber: period.period_number,
      name: period.name,
      periodType: period.period_type,
      startsAt: timeValue(period.starts_at),
      endsAt: timeValue(period.ends_at),
      ringAtStart: period.ring_at_start,
      ringAtEnd: period.ring_at_end,
      isActive: period.is_active,
    });
    periodMutation.reset();
    setPeriodDialogOpen(true);
  };

  const periods = settingsQuery.data?.periods ?? [];

  return (
    <Container maxWidth={false} sx={{ pb: 5 }}>
      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h3">
          ตั้งเวลาเรียนและคาบ
        </Typography>
        <Typography sx={{ mt: 1, color: 'text.secondary' }}>
          กำหนดเวลามาตรฐานส่วนกลางสำหรับการเข้า–ออกโรงเรียน ตารางเรียน และระบบออดในอนาคต
        </Typography>
      </Box>

      {(settingsQuery.isError || settingsMutation.isError) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {settingsMutation.error?.message ?? settingsQuery.error?.message}
        </Alert>
      )}

      <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">วันและเวลาทำการของโรงเรียน</Typography>
        <Form
          methods={settingsMethods}
          onSubmit={settingsMethods.handleSubmit((values) => settingsMutation.mutate(values))}
        >
          <Box sx={{ mt: 2.5 }}>
            <Field.MultiCheckbox
              row
              name="activeWeekdays"
              label="วันเปิดเรียนประจำสัปดาห์"
              options={DAY_OPTIONS}
            />
          </Box>
          <Box
            sx={{
              gap: 2,
              mt: 2.5,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            }}
          >
            <Field.TimePicker
              name="arrivalOpenTime"
              label="เปิดรับนักเรียน"
              ampm={false}
              required
            />
            <Field.TimePicker name="schoolStartTime" label="เวลาเข้าเรียน" ampm={false} required />
            <Field.TimePicker name="lateAfterTime" label="เริ่มนับว่าสาย" ampm={false} required />
            <Field.TimePicker name="schoolEndTime" label="เวลาเลิกเรียน" ampm={false} required />
            <Field.TimePicker
              name="departureCloseTime"
              label="ปิดรับการสแกนออก"
              ampm={false}
              required
            />
          </Box>
          <Button
            type="submit"
            variant="contained"
            loading={settingsMutation.isPending}
            sx={{ mt: 3 }}
          >
            บันทึกเวลาโรงเรียน
          </Button>
        </Form>
      </Card>

      <Alert severity="info" sx={{ mb: 3 }}>
        เตรียมข้อมูลสัญญาณออดเริ่มและสิ้นสุดแต่ละช่วงไว้แล้ว
        การเชื่อมอุปกรณ์ออดจะเปิดใช้เมื่อกำหนดผู้ให้บริการและ API ภายหลัง
      </Alert>

      <Card variant="outlined">
        <Box
          sx={{
            px: 3,
            py: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography variant="h6">ช่วงคาบเรียนและกิจกรรม</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              ใช้เป็นเวลามาตรฐานร่วมกันทั้งโรงเรียน
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={openCreatePeriod}
            startIcon={<RemixIcon icon="mingcute:add-line" />}
          >
            เพิ่มช่วงเวลา
          </Button>
        </Box>
        {(periodMutation.isError || deleteMutation.isError) && (
          <Alert severity="error" sx={{ mx: 3, mb: 2 }}>
            {periodMutation.error?.message ?? deleteMutation.error?.message}
          </Alert>
        )}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ลำดับ</TableCell>
                <TableCell>ชื่อช่วง</TableCell>
                <TableCell>ประเภท</TableCell>
                <TableCell>เวลา</TableCell>
                <TableCell>สัญญาณออด</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!settingsQuery.isLoading && !periods.length && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 7, color: 'text.secondary' }}>
                    ยังไม่มีช่วงคาบเรียน กด “เพิ่มช่วงเวลา” เพื่อเริ่มต้น
                  </TableCell>
                </TableRow>
              )}
              {periods.map((period) => (
                <TableRow key={period.id} hover>
                  <TableCell>{period.period_number}</TableCell>
                  <TableCell>
                    <Typography variant="subtitle2">{period.name}</Typography>
                  </TableCell>
                  <TableCell>{PERIOD_TYPE_LABEL[period.period_type]}</TableCell>
                  <TableCell>
                    {period.starts_at.slice(0, 5)}–{period.ends_at.slice(0, 5)} น.
                  </TableCell>
                  <TableCell>
                    {period.ring_at_start ? 'เริ่ม' : ''}
                    {period.ring_at_start && period.ring_at_end ? ' · ' : ''}
                    {period.ring_at_end ? 'สิ้นสุด' : ''}
                    {!period.ring_at_start && !period.ring_at_end ? '-' : ''}
                  </TableCell>
                  <TableCell>
                    <Label color={period.is_active ? 'success' : 'default'} variant="soft">
                      {period.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                    </Label>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton aria-label="แก้ไขช่วงเวลา" onClick={() => openEditPeriod(period)}>
                      <RemixIcon icon="solar:pen-bold" />
                    </IconButton>
                    <IconButton
                      color="error"
                      aria-label="ลบช่วงเวลา"
                      onClick={() => setDeletingPeriod(period)}
                    >
                      <RemixIcon icon="solar:trash-bin-trash-bold" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog
        open={periodDialogOpen}
        onClose={() => !periodMutation.isPending && setPeriodDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <Form
          methods={periodMethods}
          onSubmit={periodMethods.handleSubmit((values) => periodMutation.mutate(values))}
        >
          <DialogTitle>{editingPeriod ? 'แก้ไขช่วงเวลา' : 'เพิ่มช่วงเวลา'}</DialogTitle>
          <DialogContent>
            {periodMutation.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {periodMutation.error.message}
              </Alert>
            )}
            <Box sx={{ pt: 1, gap: 2, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <Field.Text name="periodNumber" label="ลำดับ" type="number" required />
              <Field.Select name="periodType" label="ประเภท" required>
                {(Object.keys(PERIOD_TYPE_LABEL) as SchoolPeriodType[]).map((type) => (
                  <MenuItem key={type} value={type}>
                    {PERIOD_TYPE_LABEL[type]}
                  </MenuItem>
                ))}
              </Field.Select>
              <Field.Text name="name" label="ชื่อช่วงเวลา" required sx={{ gridColumn: '1 / -1' }} />
              <Field.TimePicker name="startsAt" label="เวลาเริ่ม" ampm={false} required />
              <Field.TimePicker name="endsAt" label="เวลาสิ้นสุด" ampm={false} required />
              <Box sx={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap' }}>
                <Field.Checkbox name="ringAtStart" label="ส่งสัญญาณออดเมื่อเริ่ม" />
                <Field.Checkbox name="ringAtEnd" label="ส่งสัญญาณออดเมื่อสิ้นสุด" />
                <Field.Checkbox name="isActive" label="เปิดใช้งานช่วงนี้" />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              color="inherit"
              onClick={() => setPeriodDialogOpen(false)}
              disabled={periodMutation.isPending}
            >
              ยกเลิก
            </Button>
            <Button type="submit" variant="contained" loading={periodMutation.isPending}>
              บันทึก
            </Button>
          </DialogActions>
        </Form>
      </Dialog>

      <Dialog
        open={!!deletingPeriod}
        onClose={() => !deleteMutation.isPending && setDeletingPeriod(null)}
      >
        <DialogTitle>ยืนยันการลบช่วงเวลา</DialogTitle>
        <DialogContent>ต้องการลบ “{deletingPeriod?.name}” หรือไม่</DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() => setDeletingPeriod(null)}
            disabled={deleteMutation.isPending}
          >
            ยกเลิก
          </Button>
          <Button
            color="error"
            variant="contained"
            loading={deleteMutation.isPending}
            onClick={() => deletingPeriod && deleteMutation.mutate(deletingPeriod.id)}
          >
            ลบ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
