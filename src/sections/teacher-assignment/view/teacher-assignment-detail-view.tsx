'use client';

import type { AssignmentCategory } from 'src/sections/assignment/assignment-actions';
import type { TeacherAssignmentTab } from '../components/detail/teacher-assignment-detail-types';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Skeleton from '@mui/material/Skeleton';
import Container from '@mui/material/Container';

import { paths } from 'src/routes/paths';

import { useAuthContext } from 'src/auth/hooks';

import { TEACHER_ASSIGNMENT_TABS } from '../components/detail/teacher-assignment-detail-types';
import { TeacherAssignmentDetailTabs } from '../components/detail/teacher-assignment-detail-tabs';
import { TeacherAssignmentDetailHeader } from '../components/detail/teacher-assignment-detail-header';

const OverviewTab = dynamic(
  () => import('../components/detail/overview-tab').then((module) => module.OverviewTab),
  { loading: TabLoading }
);
const StudentsTab = dynamic(
  () => import('../components/detail/students-tab').then((module) => module.StudentsTab),
  { loading: TabLoading }
);
const AttendanceSection = dynamic(
  () => import('../components/attendance-section').then((module) => module.AttendanceSection),
  { loading: TabLoading }
);
const AssignmentsTab = dynamic(
  () => import('../components/detail/assignments-tab').then((module) => module.AssignmentsTab),
  { loading: TabLoading }
);
const ScoresTab = dynamic(
  () => import('../components/detail/scores-tab').then((module) => module.ScoresTab),
  { loading: TabLoading }
);
const ScheduleTab = dynamic(
  () => import('../components/detail/schedule-tab').then((module) => module.ScheduleTab),
  { loading: TabLoading }
);

type Props = {
  teacherAssignmentId: string;
};

export function TeacherAssignmentDetailView({ teacherAssignmentId }: Props) {
  const { user } = useAuthContext();
  const [tab, setTab] = useState<TeacherAssignmentTab>('overview');
  const isTeacher = user?.role === 'teacher';
  const assignmentNewPath = isTeacher
    ? paths.teacher.assignmentNew(teacherAssignmentId)
    : paths.admin.teacherAssignment.assignmentNew(teacherAssignmentId);

  useEffect(() => {
    const initialTab = new URLSearchParams(window.location.search).get('tab');
    if (initialTab && TEACHER_ASSIGNMENT_TABS.includes(initialTab as TeacherAssignmentTab)) {
      setTab(initialTab as TeacherAssignmentTab);
    }
  }, []);

  const gradebookPath = useCallback(
    (assignmentId: string) =>
      isTeacher ? paths.teacher.gradebook(assignmentId) : paths.admin.gradebook(assignmentId),
    [isTeacher]
  );
  const scoreCategoryNewPath = useCallback(
    (category: AssignmentCategory) => `${assignmentNewPath}?category=${category}&returnTab=scores`,
    [assignmentNewPath]
  );
  const openSchedule = useCallback(() => setTab('schedule'), []);

  return (
    <Container maxWidth="lg" sx={{ pb: 5 }}>
      <TeacherAssignmentDetailHeader teacherAssignmentId={teacherAssignmentId} />
      <TeacherAssignmentDetailTabs
        value={tab}
        teacherAssignmentId={teacherAssignmentId}
        onChange={setTab}
      />

      <Box role="tabpanel" aria-label={tab}>
        {tab === 'overview' && (
          <OverviewTab teacherAssignmentId={teacherAssignmentId} onOpenSchedule={openSchedule} />
        )}
        {tab === 'students' && <StudentsTab teacherAssignmentId={teacherAssignmentId} />}
        {tab === 'attendance' && <AttendanceSection teacherAssignmentId={teacherAssignmentId} />}
        {tab === 'assignments' && (
          <AssignmentsTab
            teacherAssignmentId={teacherAssignmentId}
            assignmentNewPath={assignmentNewPath}
            gradebookPath={gradebookPath}
          />
        )}
        {tab === 'scores' && (
          <ScoresTab
            teacherAssignmentId={teacherAssignmentId}
            gradebookPath={gradebookPath}
            scoreCategoryNewPath={scoreCategoryNewPath}
          />
        )}
        {tab === 'schedule' && <ScheduleTab teacherAssignmentId={teacherAssignmentId} />}
      </Box>
    </Container>
  );
}

function TabLoading() {
  return (
    <Card variant="outlined" sx={{ p: 3 }}>
      <Skeleton variant="rounded" height={220} />
    </Card>
  );
}
