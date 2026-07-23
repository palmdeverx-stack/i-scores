'use client';

import { memo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { Iconify } from 'src/components/iconify';

import { DAY_LABELS } from './teacher-assignment-detail-types';
import { getSchedules, createSchedule, deleteSchedule } from '../../teacher-assignment-actions';

type Props = {
  teacherAssignmentId: string;
};

export const ScheduleTab = memo(function ScheduleTab({ teacherAssignmentId }: Props) {
  const queryClient = useQueryClient();
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedules', teacherAssignmentId],
    queryFn: () => getSchedules(teacherAssignmentId),
  });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['schedules', teacherAssignmentId] });
  const createMutation = useMutation({
    mutationFn: () => createSchedule(teacherAssignmentId, { dayOfWeek, startTime, endTime }),
    onSuccess: refresh,
  });
  const deleteMutation = useMutation({
    mutationFn: (scheduleId: string) => deleteSchedule(teacherAssignmentId, scheduleId),
    onSuccess: refresh,
  });

  return (
    <Card variant="outlined">
      <Box sx={{ p: 2.5 }}>
        <Typography variant="h6">ตารางเวลาสอน</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          กำหนดวันและเวลาที่สอนรายวิชานี้ในแต่ละสัปดาห์
        </Typography>
      </Box>
      <Divider />
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>วัน</TableCell>
              <TableCell>เวลาเริ่ม</TableCell>
              <TableCell>เวลาสิ้นสุด</TableCell>
              <TableCell align="right">การจัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4}>กำลังโหลด...</TableCell>
              </TableRow>
            )}
            {!isLoading && !schedules?.length && (
              <TableRow>
                <TableCell colSpan={4}>ยังไม่มีตารางเวลาสอนสำหรับวิชานี้</TableCell>
              </TableRow>
            )}
            {schedules?.map((slot) => (
              <TableRow key={slot.id}>
                <TableCell>{DAY_LABELS[slot.day_of_week]}</TableCell>
                <TableCell>{slot.start_time.slice(0, 5)}</TableCell>
                <TableCell>{slot.end_time.slice(0, 5)}</TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    color="error"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(slot.id)}
                    aria-label={`ลบตารางสอนวัน${DAY_LABELS[slot.day_of_week]}`}
                  >
                    <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
        {(createMutation.error || deleteMutation.error) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {(createMutation.error ?? deleteMutation.error)?.message}
          </Alert>
        )}
        <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            select
            size="small"
            label="วัน"
            value={dayOfWeek}
            onChange={(event) => setDayOfWeek(Number(event.target.value))}
            sx={{ minWidth: 120 }}
          >
            {DAY_LABELS.slice(1).map((label, index) => (
              <MenuItem key={label} value={index + 1}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="time"
            size="small"
            label="เวลาเริ่ม"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            type="time"
            size="small"
            label="เวลาสิ้นสุด"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            loading={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            เพิ่มคาบสอน
          </Button>
        </Box>
      </Box>
    </Card>
  );
});
