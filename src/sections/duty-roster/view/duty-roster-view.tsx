'use client';

import type { ICalendarEvent } from 'src/types/calendar';
import type { DutyStaff, DutyShift, DutySchedule } from '../duty-roster-actions';

import * as z from 'zod';
import dayjs from 'dayjs';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
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
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { CALENDAR_COLOR_OPTIONS } from 'src/_mock/_calendar';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { RemixIcon } from 'src/components/remix-icon';
import { Form, Field } from 'src/components/hook-form';

import {
  getDutyRoster,
  createDutySchedule,
  deleteDutySchedule,
  updateDutySchedule,
} from '../duty-roster-actions';

const DutyCalendarView = dynamic(
  () => import('src/sections/calendar/view/calendar-view').then((module) => module.CalendarView),
  { ssr: false }
);

const SHIFT_LABEL: Record<DutyShift, string> = {
  morning: 'เวรเช้า',
  evening: 'เวรเย็น',
  full_day: 'เวรทั้งวัน',
};

const SHIFT_COLOR: Record<DutyShift, 'info' | 'warning' | 'secondary'> = {
  morning: 'info',
  evening: 'warning',
  full_day: 'secondary',
};

const WEEKDAY_OPTIONS = [
  { value: '1', label: 'จันทร์' },
  { value: '2', label: 'อังคาร' },
  { value: '3', label: 'พุธ' },
  { value: '4', label: 'พฤหัสบดี' },
  { value: '5', label: 'ศุกร์' },
  { value: '6', label: 'เสาร์' },
  { value: '0', label: 'อาทิตย์' },
];

const validDateTime = (value: string) => dayjs(value).isValid();
const timeValue = (value: string) => dayjs(`2000-01-01T${value}`).format();

const DutyScheduleSchema = z
  .object({
    dutyDate: z.string().refine(validDateTime, 'กรุณาเลือกวันที่ปฏิบัติเวร'),
    startsAt: z.string().refine(validDateTime, 'กรุณาเลือกเวลาเริ่ม'),
    endsAt: z.string().refine(validDateTime, 'กรุณาเลือกเวลาสิ้นสุด'),
    location: z
      .string()
      .trim()
      .min(1, { error: 'กรุณาระบุจุดปฏิบัติงาน' })
      .max(120, { error: 'จุดปฏิบัติงานต้องไม่เกิน 120 ตัวอักษร' }),
    staffIds: z.array(z.string().uuid()).min(1, { error: 'กรุณาเลือกครูเวรอย่างน้อย 1 คน' }),
    repeatMode: z.enum(['once', 'daily', 'custom']),
    weekdays: z.array(z.string()),
    repeatUntil: z.string().refine((value) => dayjs(value).isValid(), 'กรุณาเลือกวันสิ้นสุด'),
    note: z.string().max(500, { error: 'หมายเหตุต้องไม่เกิน 500 ตัวอักษร' }),
  })
  .superRefine((values, context) => {
    const startsAt = dayjs(values.startsAt).format('HH:mm');
    const endsAt = dayjs(values.endsAt).format('HH:mm');
    if (validDateTime(values.startsAt) && validDateTime(values.endsAt) && endsAt <= startsAt) {
      context.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม',
      });
    }
    if (values.repeatMode === 'custom' && !values.weekdays.length) {
      context.addIssue({
        code: 'custom',
        path: ['weekdays'],
        message: 'กรุณาเลือกวันทำซ้ำอย่างน้อย 1 วัน',
      });
    }
    const repeatUntil = dayjs(values.repeatUntil);
    if (
      values.repeatMode !== 'once' &&
      validDateTime(values.dutyDate) &&
      repeatUntil.isValid() &&
      repeatUntil.isBefore(dayjs(values.dutyDate), 'day')
    ) {
      context.addIssue({
        code: 'custom',
        path: ['repeatUntil'],
        message: 'วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่มต้น',
      });
    }
  });

type DutyScheduleFormValues = z.infer<typeof DutyScheduleSchema>;

const EMPTY_FORM: DutyScheduleFormValues = {
  dutyDate: dayjs().format(),
  startsAt: timeValue('06:30'),
  endsAt: timeValue('08:30'),
  location: 'ประตูหน้าโรงเรียน',
  repeatMode: 'once',
  weekdays: ['1', '2', '3', '4', '5'],
  repeatUntil: dayjs().add(1, 'month').format(),
  note: '',
  staffIds: [],
};

function staffName(staff: DutyStaff) {
  return `${staff.first_name ?? ''} ${staff.last_name ?? ''}`.trim() || staff.username;
}

function resolveDutyShift(startsAt: dayjs.Dayjs, endsAt: dayjs.Dayjs): DutyShift {
  const noon = startsAt.startOf('day').hour(12);
  if (startsAt.isBefore(noon) && endsAt.isAfter(noon)) return 'full_day';
  return startsAt.isBefore(noon) ? 'morning' : 'evening';
}

export function DutyRosterView() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DutySchedule | null>(null);
  const [deleting, setDeleting] = useState<DutySchedule | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const methods = useForm<DutyScheduleFormValues>({
    resolver: zodResolver(DutyScheduleSchema),
    defaultValues: EMPTY_FORM,
  });
  const { reset, watch, handleSubmit } = methods;
  const repeatMode = watch('repeatMode');

  const rosterQuery = useQuery({ queryKey: ['duty-roster'], queryFn: getDutyRoster });
  const schedules = useMemo(() => rosterQuery.data?.schedules ?? [], [rosterQuery.data?.schedules]);
  const staff = rosterQuery.data?.staff;
  const staffOptions = useMemo(
    () => (staff ?? []).map((person) => ({ ...person, name: staffName(person) })),
    [staff]
  );
  const calendarEvents = useMemo<ICalendarEvent[]>(
    () =>
      schedules.map((schedule) => {
        const assigneeNames = schedule.assignees
          .map((assignee) => staffName(assignee.staff))
          .join(', ');

        return {
          id: schedule.id,
          title: `${SHIFT_LABEL[schedule.shift]} · ${assigneeNames} · ${schedule.location}`,
          description: assigneeNames,
          color:
            schedule.shift === 'morning'
              ? CALENDAR_COLOR_OPTIONS[2]
              : schedule.shift === 'evening'
                ? CALENDAR_COLOR_OPTIONS[5]
                : CALENDAR_COLOR_OPTIONS[1],
          allDay: false,
          start: `${schedule.duty_date}T${schedule.starts_at}`,
          end: `${schedule.duty_date}T${schedule.ends_at}`,
        };
      }),
    [schedules]
  );

  const saveMutation = useMutation({
    mutationFn: (values: DutyScheduleFormValues) => {
      const dutyDate = dayjs(values.dutyDate);
      const startsAt = dayjs(values.startsAt);
      const endsAt = dayjs(values.endsAt);
      const input = {
        dutyDate: dutyDate.format('YYYY-MM-DD'),
        shift: resolveDutyShift(startsAt, endsAt),
        startsAt: startsAt.format('HH:mm'),
        endsAt: endsAt.format('HH:mm'),
        location: values.location.trim(),
        note: values.note.trim(),
        staffIds: values.staffIds,
        weekdays:
          values.repeatMode === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : values.weekdays.map(Number),
        repeatUntil:
          values.repeatMode === 'once' ? null : dayjs(values.repeatUntil).format('YYYY-MM-DD'),
      };
      return editing ? updateDutySchedule(editing.id, input) : createDutySchedule(input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['duty-roster'] });
      toast.success(editing ? 'แก้ไขตารางครูเวรสำเร็จ' : 'เพิ่มตารางครูเวรสำเร็จ');
      setDialogOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDutySchedule(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['duty-roster'] });
      toast.success('ลบตารางครูเวรสำเร็จ');
      setDeleting(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    reset({
      ...EMPTY_FORM,
      dutyDate: dayjs().format(),
      startsAt: timeValue('06:30'),
      endsAt: timeValue('08:30'),
      repeatUntil: dayjs().add(1, 'month').format(),
      staffIds: [],
    });
    saveMutation.reset();
    setDialogOpen(true);
  };

  const openEdit = (schedule: DutySchedule) => {
    setEditing(schedule);
    reset({
      dutyDate: dayjs(schedule.duty_date).format(),
      startsAt: timeValue(schedule.starts_at),
      endsAt: timeValue(schedule.ends_at),
      location: schedule.location,
      note: schedule.note ?? '',
      staffIds: schedule.assignees.map((assignee) => assignee.staff_id),
      repeatMode: !schedule.recurrence_group_id
        ? 'once'
        : schedule.recurrence_weekdays?.length === 7
          ? 'daily'
          : 'custom',
      weekdays: (schedule.recurrence_weekdays ?? [1, 2, 3, 4, 5]).map(String),
      repeatUntil: dayjs(schedule.recurrence_until ?? schedule.duty_date).format(),
    });
    saveMutation.reset();
    setDialogOpen(true);
  };

  const onSubmit = handleSubmit((values) => saveMutation.mutate(values));

  return (
    <Container maxWidth={false} sx={{ pb: 5 }}>
      <Box
        sx={{
          mb: 4,
          gap: 2,
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography component="h1" variant="h3">
            จัดตารางครูเวร
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            กำหนดครูเวรประจำวัน ช่วงเวลา และจุดรับ–ส่งนักเรียน
          </Typography>
        </Box>
        <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap' }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={viewMode}
            onChange={(_, value) => value && setViewMode(value)}
            aria-label="รูปแบบการแสดงตารางครูเวร"
          >
            <ToggleButton value="table" aria-label="มุมมองตาราง">
              <RemixIcon icon="solar:list-bold" sx={{ mr: 0.75 }} />
              ตาราง
            </ToggleButton>
            <ToggleButton value="calendar" aria-label="มุมมองปฏิทิน">
              <RemixIcon icon="solar:calendar-bold" sx={{ mr: 0.75 }} />
              ปฏิทิน
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            onClick={openCreate}
            startIcon={<RemixIcon icon="mingcute:add-line" />}
          >
            เพิ่มตารางเวร
          </Button>
        </Box>
      </Box>

      {(rosterQuery.isError || saveMutation.isError || deleteMutation.isError) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {saveMutation.error?.message ||
            deleteMutation.error?.message ||
            rosterQuery.error?.message}
        </Alert>
      )}

      {viewMode === 'table' ? (
        <Card variant="outlined">
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>วันที่</TableCell>
                  <TableCell>ช่วงเวร</TableCell>
                  <TableCell>เวลา</TableCell>
                  <TableCell>จุดปฏิบัติงาน</TableCell>
                  <TableCell>ครูเวร</TableCell>
                  <TableCell align="right">จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rosterQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={6}>กำลังโหลด...</TableCell>
                  </TableRow>
                )}
                {!rosterQuery.isLoading && !schedules.length && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 7, color: 'text.secondary' }}>
                      ยังไม่มีตารางครูเวร กด “เพิ่มตารางเวร” เพื่อเริ่มต้น
                    </TableCell>
                  </TableRow>
                )}
                {schedules
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((schedule) => (
                    <TableRow key={schedule.id} hover>
                      <TableCell>
                        {dayjs(schedule.duty_date).format('DD/MM/YYYY')}
                        {schedule.recurrence_group_id && (
                          <Chip
                            size="small"
                            variant="soft"
                            color="primary"
                            label="ทำซ้ำ"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Label color={SHIFT_COLOR[schedule.shift]}>
                          {SHIFT_LABEL[schedule.shift]}
                        </Label>
                      </TableCell>
                      <TableCell>
                        {schedule.starts_at.slice(0, 5)}–{schedule.ends_at.slice(0, 5)} น.
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2">{schedule.location}</Typography>
                        {schedule.note && (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {schedule.note}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ gap: 0.75, display: 'flex', flexWrap: 'wrap' }}>
                          {schedule.assignees.map((assignee) => (
                            <Chip
                              key={assignee.id}
                              size="small"
                              avatar={<Avatar src={assignee.staff.avatar_url ?? undefined} />}
                              label={staffName(assignee.staff)}
                            />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton aria-label="แก้ไขตารางเวร" onClick={() => openEdit(schedule)}>
                          <RemixIcon icon="solar:pen-bold" />
                        </IconButton>
                        <IconButton
                          color="error"
                          aria-label="ลบตารางเวร"
                          onClick={() => setDeleting(schedule)}
                        >
                          <RemixIcon icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={schedules.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(Number(event.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50]}
            labelRowsPerPage="แสดงต่อหน้า"
          />
        </Card>
      ) : (
        <DutyCalendarView
          embedded
          editable={false}
          events={calendarEvents}
          loading={rosterQuery.isLoading}
          showCreateButton={false}
          onEventClick={(eventId) => {
            const schedule = schedules.find((item) => item.id === eventId);
            if (schedule) openEdit(schedule);
          }}
        />
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => !saveMutation.isPending && setDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <Form methods={methods} onSubmit={onSubmit}>
          <DialogTitle>{editing ? 'แก้ไขตารางครูเวร' : 'เพิ่มตารางครูเวร'}</DialogTitle>
          <DialogContent>
            <Box
              sx={{
                pt: 1,
                gap: 2,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              }}
            >
              <Typography variant="subtitle1" sx={{ gridColumn: '1 / -1' }}>
                1. วันและเวลาปฏิบัติเวร
              </Typography>
              <Field.DatePicker
                name="dutyDate"
                label="วันที่เริ่ม"
                format="DD/MM/YYYY"
                required
                slotProps={{ textField: { fullWidth: true } }}
              />
              <Field.TimePicker
                name="startsAt"
                label="เวลาเริ่ม"
                ampm={false}
                required
                slotProps={{ textField: { fullWidth: true } }}
              />
              <Field.TimePicker
                name="endsAt"
                label="เวลาสิ้นสุด"
                ampm={false}
                required
                slotProps={{ textField: { fullWidth: true } }}
              />

              <Box
                sx={{
                  p: 2,
                  gap: 2,
                  display: 'grid',
                  borderRadius: 1.5,
                  gridColumn: '1 / -1',
                  bgcolor: 'background.neutral',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                }}
              >
                <Field.Select name="repeatMode" label="ต้องการทำซ้ำหรือไม่">
                  <MenuItem value="once">ไม่ทำซ้ำ — เฉพาะวันที่เลือก</MenuItem>
                  <MenuItem value="daily">ทำซ้ำทุกวัน</MenuItem>
                  <MenuItem value="custom">ทำซ้ำเฉพาะวันที่กำหนด</MenuItem>
                </Field.Select>

                {repeatMode !== 'once' && (
                  <Field.DatePicker
                    name="repeatUntil"
                    label="สิ้นสุดการทำซ้ำ"
                    format="DD/MM/YYYY"
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                )}

                {repeatMode === 'custom' && (
                  <Field.MultiCheckbox
                    row
                    name="weekdays"
                    label="ทำซ้ำในวัน"
                    options={WEEKDAY_OPTIONS}
                    slotProps={{ wrapper: { sx: { gridColumn: '1 / -1' } } }}
                  />
                )}
              </Box>

              <Typography variant="subtitle1" sx={{ mt: 1, gridColumn: '1 / -1' }}>
                2. จุดปฏิบัติงานและครูเวร
              </Typography>

              <Field.Text
                name="location"
                label="จุดปฏิบัติงาน"
                placeholder="เช่น ประตูหน้าโรงเรียน"
                required
                sx={{ gridColumn: '1 / -1' }}
              />
              <Field.Autocomplete
                name="staffIds"
                label="ครูเวร"
                multiple
                required
                options={staffOptions}
                placeholder="ค้นหาและเลือกครู"
                helperText="เลือกครูเวรอย่างน้อย 1 คน"
                sx={{ gridColumn: '1 / -1' }}
              />
              <Field.Text
                name="note"
                label="หมายเหตุ"
                multiline
                minRows={2}
                sx={{ gridColumn: '1 / -1' }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              color="inherit"
              onClick={() => setDialogOpen(false)}
              disabled={saveMutation.isPending}
            >
              ยกเลิก
            </Button>
            <Button type="submit" variant="contained" loading={saveMutation.isPending}>
              บันทึก
            </Button>
          </DialogActions>
        </Form>
      </Dialog>

      <Dialog open={!!deleting} onClose={() => !deleteMutation.isPending && setDeleting(null)}>
        <DialogTitle>ยืนยันการลบตารางเวร</DialogTitle>
        <DialogContent>
          ต้องการลบตารางเวรวันที่ {deleting ? dayjs(deleting.duty_date).format('DD/MM/YYYY') : ''}{' '}
          หรือไม่
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() => setDeleting(null)}
            disabled={deleteMutation.isPending}
          >
            ยกเลิก
          </Button>
          <Button
            color="error"
            variant="contained"
            loading={deleteMutation.isPending}
            onClick={() => deleting && deleteMutation.mutate(deleting.id)}
          >
            ลบตารางเวร
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
