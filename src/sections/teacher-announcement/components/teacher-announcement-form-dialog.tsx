'use client';

import type {
  TeacherClassroom,
  TeacherAnnouncement,
  AnnouncementPayload,
} from '../teacher-announcement-actions';

import * as z from 'zod';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import FormGroup from '@mui/material/FormGroup';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormHelperText from '@mui/material/FormHelperText';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import {
  createTeacherAnnouncement,
  updateTeacherAnnouncement,
} from '../teacher-announcement-actions';

// ----------------------------------------------------------------------

const FormSchema = z
  .object({
    title: z.string().trim().min(1, 'กรุณากรอกหัวข้อประกาศ'),
    content: z.string().trim().min(1, 'กรุณากรอกเนื้อหาประกาศ'),
    announcementType: z.enum(['general', 'holiday', 'exam']),
    priority: z.enum(['normal', 'important', 'urgent']),
    classroomIds: z.array(z.string()).min(1, 'เลือกห้องเรียนอย่างน้อย 1 ห้อง'),
    eventStart: z.string(),
    eventEnd: z.string(),
    expiresAt: z.string(),
  })
  .refine((data) => !data.eventStart || !data.eventEnd || data.eventEnd >= data.eventStart, {
    message: 'วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่มต้น',
    path: ['eventEnd'],
  });

type FormValues = z.infer<typeof FormSchema>;
type Props = {
  open: boolean;
  announcement: TeacherAnnouncement | null;
  classrooms: TeacherClassroom[];
  onClose: () => void;
};

const emptyValues: FormValues = {
  title: '',
  content: '',
  announcementType: 'general',
  priority: 'normal',
  classroomIds: [],
  eventStart: '',
  eventEnd: '',
  expiresAt: '',
};

function toLocalInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function TeacherAnnouncementFormDialog({ open, announcement, classrooms, onClose }: Props) {
  const queryClient = useQueryClient();
  const methods = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: emptyValues,
  });

  const createMutation = useMutation({
    mutationFn: createTeacherAnnouncement,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['teacher-announcements'] });
      await queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      onClose();
    },
  });
  const updateMutation = useMutation({
    mutationFn: (payload: AnnouncementPayload) =>
      updateTeacherAnnouncement(announcement!.id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['teacher-announcements'] });
      await queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      onClose();
    },
  });

  useEffect(() => {
    if (!open) return;
    createMutation.reset();
    updateMutation.reset();
    methods.reset(
      announcement
        ? {
            title: announcement.title,
            content: announcement.content,
            announcementType: announcement.announcement_type,
            priority: announcement.priority,
            classroomIds: announcement.targets.map((target) => target.classroom_id),
            eventStart: toLocalInput(announcement.event_start),
            eventEnd: toLocalInput(announcement.event_end),
            expiresAt: toLocalInput(announcement.expires_at),
          }
        : emptyValues
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcement, methods, open]);

  const pending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error ?? updateMutation.error;
  const onSubmit = methods.handleSubmit((values) => {
    const payload: AnnouncementPayload = {
      ...values,
      eventStart: values.eventStart ? new Date(values.eventStart).toISOString() : '',
      eventEnd: values.eventEnd ? new Date(values.eventEnd).toISOString() : '',
      expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : '',
    };
    if (announcement) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  });

  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} fullWidth maxWidth="sm">
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6">
                {announcement ? 'แก้ไขประกาศ' : 'สร้างประกาศใหม่'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                ข่าวสารจะส่งถึงนักเรียนในห้องที่เลือกเท่านั้น
              </Typography>
            </Box>
            <IconButton onClick={onClose} disabled={pending} aria-label="ปิดหน้าต่าง">
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error.message}
            </Alert>
          )}
          <Box sx={{ mt: 2, gap: 2.5, display: 'flex', flexDirection: 'column' }}>
            <Field.Text name="title" label="หัวข้อประกาศ *" />
            <Field.Text name="content" label="รายละเอียด *" multiline minRows={4} />
            <Box
              sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
            >
              <Field.Select name="announcementType" label="ประเภทประกาศ">
                <MenuItem value="general">ประกาศทั่วไป</MenuItem>
                <MenuItem value="holiday">วันหยุด</MenuItem>
                <MenuItem value="exam">วันสอบ</MenuItem>
              </Field.Select>
              <Field.Select name="priority" label="ความสำคัญ">
                <MenuItem value="normal">ทั่วไป</MenuItem>
                <MenuItem value="important">สำคัญ</MenuItem>
                <MenuItem value="urgent">เร่งด่วน</MenuItem>
              </Field.Select>
            </Box>

            <Controller
              name="classroomIds"
              control={methods.control}
              render={({ field, fieldState }) => (
                <FormControl error={!!fieldState.error}>
                  <Typography variant="subtitle2">กลุ่มเป้าหมาย *</Typography>
                  <Typography variant="caption" sx={{ mb: 1, color: 'text.secondary' }}>
                    เลือกได้หลายห้องจากห้องเรียนที่คุณรับผิดชอบ
                  </Typography>
                  <FormGroup
                    sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
                  >
                    {classrooms.map((classroom) => (
                      <FormControlLabel
                        key={classroom.id}
                        label={`${classroom.name}${classroom.grade_level ? ` · ${classroom.grade_level}` : ''}`}
                        control={
                          <Checkbox
                            checked={field.value.includes(classroom.id)}
                            onChange={(event) =>
                              field.onChange(
                                event.target.checked
                                  ? [...field.value, classroom.id]
                                  : field.value.filter((id) => id !== classroom.id)
                              )
                            }
                          />
                        }
                      />
                    ))}
                  </FormGroup>
                  {!classrooms.length && (
                    <Alert severity="warning">ยังไม่มีห้องเรียนที่รับผิดชอบ</Alert>
                  )}
                  <FormHelperText>{fieldState.error?.message}</FormHelperText>
                </FormControl>
              )}
            />

            <Box
              sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
            >
              <Field.DatePicker name="eventStart" label="วันเวลาเริ่มกิจกรรม" />
              <Field.DatePicker name="eventEnd" label="วันเวลาสิ้นสุดกิจกรรม" />
            </Box>
            <Field.DatePicker name="expiresAt" label="ซ่อนประกาศอัตโนมัติเมื่อ" />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button color="inherit" onClick={onClose} disabled={pending}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="contained" loading={pending} disabled={!classrooms.length}>
            {announcement ? 'บันทึกการแก้ไข' : 'เผยแพร่ประกาศ'}
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
