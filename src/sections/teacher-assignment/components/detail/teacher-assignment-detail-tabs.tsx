'use client';

import type { TeacherAssignmentTab } from './teacher-assignment-detail-types';

import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';

import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';

import { Iconify } from 'src/components/iconify';

import { listAssignments } from 'src/sections/assignment/assignment-actions';

import { getRoster, getSchedules } from '../../teacher-assignment-actions';

type Props = {
  value: TeacherAssignmentTab;
  teacherAssignmentId: string;
  onChange: (value: TeacherAssignmentTab) => void;
};

export const TeacherAssignmentDetailTabs = memo(function TeacherAssignmentDetailTabs({
  value,
  teacherAssignmentId,
  onChange,
}: Props) {
  const { data: roster } = useQuery({
    queryKey: ['roster', teacherAssignmentId],
    queryFn: () => getRoster(teacherAssignmentId),
  });
  const { data: assignments } = useQuery({
    queryKey: ['assignments', teacherAssignmentId],
    queryFn: () => listAssignments(teacherAssignmentId),
  });
  const { data: schedules } = useQuery({
    queryKey: ['schedules', teacherAssignmentId],
    queryFn: () => getSchedules(teacherAssignmentId),
  });
  const workCount =
    assignments?.filter((assignment) => assignment.category === 'assignment').length ?? 0;

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <Tabs
        value={value}
        onChange={(_event, nextValue: TeacherAssignmentTab) => onChange(nextValue)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="ส่วนข้อมูลรายวิชา"
        sx={{ px: { xs: 1, sm: 2 } }}
      >
        <Tab
          value="overview"
          label="ภาพรวม"
          icon={<Iconify icon="solar:chart-square-outline" />}
          iconPosition="start"
        />
        <Tab
          value="students"
          label={`นักเรียน (${roster?.roster.length ?? 0})`}
          icon={<Iconify icon="solar:users-group-rounded-bold" />}
          iconPosition="start"
        />
        <Tab
          value="attendance"
          label="เช็คชื่อ"
          icon={<Iconify icon="solar:check-circle-bold" />}
          iconPosition="start"
        />
        <Tab
          value="assignments"
          label={`งาน (${workCount})`}
          icon={<Iconify icon="solar:list-bold" />}
          iconPosition="start"
        />
        <Tab
          value="scores"
          label="จัดการคะแนน"
          icon={<Iconify icon="solar:cup-star-bold" />}
          iconPosition="start"
        />
        <Tab
          value="schedule"
          label={`ตารางสอน (${schedules?.length ?? 0})`}
          icon={<Iconify icon="solar:calendar-date-bold" />}
          iconPosition="start"
        />
      </Tabs>
    </Card>
  );
});
