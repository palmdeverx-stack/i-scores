'use client';

import Box from '@mui/material/Box';

import { SubjectCard } from '../components/subject-card';
import { StudentWeeklyTimetable } from '../components/student-weekly-timetable';
import {
  HeroStat,
  EmptyCard,
  HeroStats,
  SectionHeading,
  StudentPageState,
  StudentPageScaffold,
  useStudentDashboard,
} from './student-dashboard-shared';

// ----------------------------------------------------------------------

export function StudentSubjectsView() {
  const { data, isLoading, isError, refetch } = useStudentDashboard('subjects');

  if (isLoading || isError || !data) {
    return <StudentPageState isLoading={isLoading} isError={isError || !data} onRetry={refetch} />;
  }

  return (
    <StudentPageScaffold
      data={data}
      section="subjects"
      stats={
        <HeroStats>
          <HeroStat
            icon="solar:notebook-bold-duotone"
            label="วิชาเรียน"
            value={data.subjects.length}
          />
          <HeroStat
            icon="solar:calendar-date-bold"
            label="คาบ/สัปดาห์"
            value={data.schedules.length}
          />
        </HeroStats>
      }
    >
      <StudentWeeklyTimetable schedules={data.schedules} />

      <Box sx={{ mt: 5 }}>
        <SectionHeading
          icon="solar:notebook-bold-duotone"
          title="วิชาที่ต้องเรียน"
          subtitle={`${data.subjects.length} รายวิชาตามห้องเรียนและภาคเรียนของคุณ`}
        />

        {data.subjects.length ? (
          <Box
            sx={{
              gap: 2.5,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            }}
          >
            {data.subjects.map((item) => (
              <SubjectCard key={item.id} item={item} />
            ))}
          </Box>
        ) : (
          <EmptyCard text="ยังไม่มีรายวิชาที่เปิดสอนสำหรับห้องเรียนของคุณ" />
        )}
      </Box>
    </StudentPageScaffold>
  );
}
