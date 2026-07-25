'use client';

import type { ClassroomScheduleAssignment } from '../schedule-builder-actions';

import dayjs from 'dayjs';
import { useState } from 'react';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';

// ----------------------------------------------------------------------

const DAY_LABELS = ['', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

type Props = {
  open: boolean;
  assignments: ClassroomScheduleAssignment[];
  onClose: () => void;
  onSubmit: (params: {
    teacherAssignmentId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }) => Promise<void>;
};

function assignmentLabel(assignment: ClassroomScheduleAssignment) {
  const subject = assignment.subject?.name ?? 'ไม่ระบุวิชา';
  const teacher = `${assignment.teacher?.first_name ?? ''} ${assignment.teacher?.last_name ?? ''}`.trim();
  return teacher ? `${subject} · ครู${teacher}` : subject;
}

export function ScheduleSlotFormDialog({ open, assignments, onClose, onSubmit }: Props) {
  const [teacherAssignmentId, setTeacherAssignmentId] = useState(assignments[0]?.id ?? '');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const invalidTime = startTime >= endTime;

  const handleSubmit = async () => {
    if (!teacherAssignmentId) {
      setError('กรุณาเลือกวิชา/ครูผู้สอน');
      return;
    }
    if (invalidTime) {
      setError('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น');
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await onSubmit({ teacherAssignmentId, dayOfWeek, startTime, endTime });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'ไม่สามารถเพิ่มคาบสอนได้');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog fullWidth maxWidth="xs" open={open} onClose={isSaving ? undefined : onClose}>
      <DialogTitle>เพิ่มคาบสอน</DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          select
          fullWidth
          label="วิชา / ครูผู้สอน"
          value={teacherAssignmentId}
          onChange={(event) => setTeacherAssignmentId(event.target.value)}
          sx={{ mt: 1 }}
        >
          {assignments.map((assignment) => (
            <MenuItem key={assignment.id} value={assignment.id}>
              {assignmentLabel(assignment)}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          fullWidth
          label="วัน"
          value={dayOfWeek}
          onChange={(event) => setDayOfWeek(Number(event.target.value))}
          sx={{ mt: 2 }}
        >
          {DAY_LABELS.slice(1).map((label, index) => (
            <MenuItem key={label} value={index + 1}>
              {label}
            </MenuItem>
          ))}
        </TextField>

        <TimePicker
          label="เวลาเริ่ม"
          value={dayjs(`2000-01-01T${startTime}`)}
          onChange={(value) => {
            if (value?.isValid()) {
              setStartTime(value.format('HH:mm'));
              setError(null);
            }
          }}
          ampm={false}
          format="HH:mm"
          slotProps={{ textField: { fullWidth: true } }}
          sx={{ mt: 2 }}
        />

        <TimePicker
          label="เวลาสิ้นสุด"
          value={dayjs(`2000-01-01T${endTime}`)}
          onChange={(value) => {
            if (value?.isValid()) {
              setEndTime(value.format('HH:mm'));
              setError(null);
            }
          }}
          ampm={false}
          format="HH:mm"
          slotProps={{
            textField: {
              fullWidth: true,
              error: invalidTime,
              helperText: invalidTime ? 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น' : undefined,
            },
          }}
          sx={{ mt: 2 }}
        />
      </DialogContent>

      <DialogActions>
        <Button color="inherit" variant="outlined" disabled={isSaving} onClick={onClose}>
          ยกเลิก
        </Button>
        <Button
          variant="contained"
          loading={isSaving}
          disabled={invalidTime || !assignments.length}
          onClick={handleSubmit}
        >
          เพิ่มคาบสอน
        </Button>
      </DialogActions>
    </Dialog>
  );
}
