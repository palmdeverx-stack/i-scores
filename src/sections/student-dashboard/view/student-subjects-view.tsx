'use client';

import type { StudentSubject, StudentDashboard } from '../student-dashboard-actions';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { Iconify } from 'src/components/iconify';

import {
  HeroStat,
  EmptyCard,
  HeroStats,
  displayName,
  isSubmitted,
  SectionHeading,
  StudentPageState,
  StudentPageScaffold,
  useStudentDashboard,
} from './student-dashboard-shared';

// ----------------------------------------------------------------------

const DAYS = [
  { value: 1, label: 'จันทร์' },
  { value: 2, label: 'อังคาร' },
  { value: 3, label: 'พุธ' },
  { value: 4, label: 'พฤหัสบดี' },
  { value: 5, label: 'ศุกร์' },
  { value: 6, label: 'เสาร์' },
  { value: 7, label: 'อาทิตย์' },
];

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
      <ScheduleSection schedules={data.schedules} />

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

// ----------------------------------------------------------------------

function ScheduleSection({ schedules }: { schedules: StudentDashboard['schedules'] }) {
  const schedulesByDay = new Map<number, typeof schedules>();
  schedules.forEach((schedule) => {
    schedulesByDay.set(schedule.day_of_week, [
      ...(schedulesByDay.get(schedule.day_of_week) ?? []),
      schedule,
    ]);
  });
  const today = new Date().getDay() || 7;
  const visibleDays = DAYS.filter(
    (day) => day.value <= 5 || schedules.some((schedule) => schedule.day_of_week === day.value)
  );

  return (
    <Card variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3 }}>
      <SectionHeading
        compact
        icon="solar:calendar-date-bold"
        title="ตารางเรียน"
        subtitle="ตารางเรียนประจำสัปดาห์"
      />

      {schedules.length ? (
        <Box
          sx={{
            gap: 1,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          }}
        >
          {visibleDays.map((day) => {
            const daySchedules = [...(schedulesByDay.get(day.value) ?? [])].sort((a, b) =>
              a.start_time.localeCompare(b.start_time)
            );
            const isToday = day.value === today;

            return (
              <Box
                key={day.value}
                sx={{
                  p: 1.5,
                  minWidth: 0,
                  borderRadius: 2,
                  bgcolor: isToday ? '#E8F5F2' : 'background.neutral',
                  border: '1px solid',
                  borderColor: isToday ? '#9CD4C8' : 'transparent',
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 1 }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ color: isToday ? '#174D45' : 'text.primary' }}
                  >
                    {day.label}
                  </Typography>
                  {isToday && (
                    <Chip
                      size="small"
                      label="วันนี้"
                      sx={{ height: 22, color: '#174D45', bgcolor: '#CDE9E3' }}
                    />
                  )}
                </Stack>

                {daySchedules.length ? (
                  <Stack spacing={0.75}>
                    {daySchedules.map((schedule) => (
                      <Box
                        key={schedule.id}
                        sx={{
                          px: 1.25,
                          py: 1,
                          minWidth: 0,
                          borderRadius: 1.25,
                          bgcolor: 'background.paper',
                          borderLeft: '3px solid #65B8A8',
                          boxShadow: '0 2px 7px rgba(26, 60, 52, 0.07)',
                        }}
                      >
                        <Typography variant="subtitle2" noWrap>
                          {schedule.subject.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          noWrap
                          sx={{ display: 'block', color: 'text.secondary' }}
                        >
                          {schedule.start_time.slice(0, 5)}–{schedule.end_time.slice(0, 5)} น. ·
                          ห้อง {schedule.classroom.name}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                    ไม่มีเรียน
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      ) : (
        <EmptyCard text="ยังไม่มีการกำหนดตารางเรียน" compact />
      )}
    </Card>
  );
}

function SubjectCard({ item }: { item: StudentSubject }) {
  const submitted = item.assignments.filter((assignment) => isSubmitted(assignment.status)).length;

  return (
    <Card variant="outlined" sx={{ overflow: 'hidden', borderRadius: 3 }}>
      <Box
        sx={{
          height: 120,
          position: 'relative',
          bgcolor: '#E8F5F2',
          background: item.subject.image_url
            ? `linear-gradient(0deg, rgba(17,54,48,0.36), rgba(17,54,48,0.04)), url(${item.subject.image_url}) center/cover`
            : 'linear-gradient(135deg, #DFF1ED 0%, #B8DED5 100%)',
        }}
      >
        {!item.subject.image_url && (
          <Iconify
            icon="solar:notebook-bold-duotone"
            width={56}
            sx={{ right: 20, bottom: 16, position: 'absolute', color: '#438E7E', opacity: 0.7 }}
          />
        )}
        <Chip
          size="small"
          label={item.subject.code || 'รายวิชา'}
          sx={{ top: 14, left: 14, position: 'absolute', bgcolor: 'rgba(255,255,255,0.9)' }}
        />
      </Box>

      <Box sx={{ p: 2.25 }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          {item.subject.name}
        </Typography>
        <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
          ครู {displayName(item.teacher)}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {item.semester.name} · ห้อง {item.classroom.name} · {item.subject.credits ?? 0} หน่วยกิต
        </Typography>

        <Divider sx={{ my: 1.75 }} />
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            การส่งงาน
          </Typography>
          <Typography variant="subtitle2">
            {submitted}/{item.assignments.length} งาน
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={item.assignments.length ? (submitted / item.assignments.length) * 100 : 0}
          sx={{ mt: 1, height: 6, borderRadius: 4 }}
        />
      </Box>
    </Card>
  );
}
