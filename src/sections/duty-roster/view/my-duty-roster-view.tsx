'use client';

import type { ICalendarEvent } from 'src/types/calendar';
import type { DutyStaff, DutySchedule } from '../duty-roster-actions';

import dayjs from 'dayjs';
import dynamic from 'next/dynamic';
import { useRef, useMemo, useEffect } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { CALENDAR_COLOR_OPTIONS } from 'src/_mock/_calendar';

import { Label } from 'src/components/label';
import { RemixIcon } from 'src/components/remix-icon';

import { getMyDutyRosterPage, getMyDutyRosterCalendar } from '../duty-roster-actions';

const DutyCalendarView = dynamic(
  () => import('src/sections/calendar/view/calendar-view').then((module) => module.CalendarView),
  { ssr: false }
);

type DutyStatus = 'active' | 'today' | 'upcoming' | 'completed';

const STATUS_CONFIG: Record<
  DutyStatus,
  { label: string; color: 'success' | 'warning' | 'info' | 'default' }
> = {
  active: { label: 'กำลังปฏิบัติหน้าที่', color: 'success' },
  today: { label: 'วันนี้', color: 'warning' },
  upcoming: { label: 'กำลังจะถึง', color: 'info' },
  completed: { label: 'เสร็จสิ้นแล้ว', color: 'default' },
};

function staffName(staff: DutyStaff) {
  return `${staff.first_name ?? ''} ${staff.last_name ?? ''}`.trim() || staff.username;
}

function scheduleTimes(schedule: DutySchedule) {
  return {
    startsAt: dayjs(`${schedule.duty_date}T${schedule.starts_at}`),
    endsAt: dayjs(`${schedule.duty_date}T${schedule.ends_at}`),
  };
}

function dutyStatus(schedule: DutySchedule, now: dayjs.Dayjs): DutyStatus {
  const { startsAt, endsAt } = scheduleTimes(schedule);
  if ((now.isAfter(startsAt) || now.isSame(startsAt)) && now.isBefore(endsAt)) return 'active';
  if (now.isSame(startsAt, 'day') && now.isBefore(startsAt)) return 'today';
  if (now.isBefore(startsAt)) return 'upcoming';
  return 'completed';
}

function DutyCard({
  schedule,
  now,
  onClick,
}: {
  schedule: DutySchedule;
  now: dayjs.Dayjs;
  onClick: () => void;
}) {
  const status = dutyStatus(schedule, now);
  const statusConfig = STATUS_CONFIG[status];
  const { startsAt, endsAt } = scheduleTimes(schedule);

  return (
    <Card
      component="button"
      type="button"
      onClick={onClick}
      variant="outlined"
      sx={{
        width: 1,
        p: { xs: 2, sm: 2.5 },
        cursor: 'pointer',
        textAlign: 'left',
        font: 'inherit',
        borderColor: status === 'active' ? 'success.main' : 'divider',
        bgcolor: status === 'active' ? 'success.lighter' : 'background.paper',
      }}
    >
      <Box
        sx={{
          gap: 2,
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ gap: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="h6">
              {new Intl.DateTimeFormat('th-TH', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }).format(startsAt.toDate())}
            </Typography>
            <Label color={statusConfig.color} variant="soft">
              {statusConfig.label}
            </Label>
          </Box>
          <Typography variant="h4" sx={{ mt: 1, color: 'primary.main' }}>
            {startsAt.format('HH:mm')}–{endsAt.format('HH:mm')} น.
          </Typography>
        </Box>
        <Box
          sx={{
            px: 2,
            py: 1.25,
            gap: 1,
            display: 'flex',
            minWidth: { sm: 240 },
            borderRadius: 1.5,
            alignItems: 'center',
            bgcolor: 'background.neutral',
          }}
        >
          <RemixIcon icon="solar:map-point-bold" sx={{ color: 'primary.main' }} />
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              จุดปฏิบัติงาน
            </Typography>
            <Typography variant="subtitle2">{schedule.location}</Typography>
          </Box>
        </Box>
      </Box>

      {schedule.note && (
        <Alert severity="info" icon={false} sx={{ mt: 2 }}>
          {schedule.note}
        </Alert>
      )}

      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        ครูเวรร่วม
      </Typography>
      <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap' }}>
        {schedule.assignees.map((assignee) => (
          <Chip
            key={assignee.id}
            avatar={<Avatar src={assignee.staff.avatar_url ?? undefined} />}
            label={staffName(assignee.staff)}
            variant="outlined"
          />
        ))}
      </Box>
    </Card>
  );
}

export function MyDutyRosterView() {
  const router = useRouter();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isDesktop = useMediaQuery((theme) => theme.breakpoints.up('md'));
  const mobileRosterQuery = useInfiniteQuery({
    queryKey: ['my-duty-roster', 'mobile'],
    queryFn: ({ pageParam }) => getMyDutyRosterPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    enabled: !isDesktop,
    refetchInterval: 60_000,
  });
  const calendarRosterQuery = useQuery({
    queryKey: ['my-duty-roster', 'calendar'],
    queryFn: getMyDutyRosterCalendar,
    enabled: isDesktop,
    refetchInterval: 60_000,
  });
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = mobileRosterQuery;
  const now = dayjs();
  const schedules = useMemo(
    () => mobileRosterQuery.data?.pages.flatMap((page) => page.schedules) ?? [],
    [mobileRosterQuery.data?.pages]
  );
  const calendarSchedules = useMemo(
    () => calendarRosterQuery.data ?? [],
    [calendarRosterQuery.data]
  );
  const calendarEvents = useMemo<ICalendarEvent[]>(
    () =>
      calendarSchedules.map((schedule) => {
        const names = schedule.assignees.map((assignee) => staffName(assignee.staff)).join(', ');
        return {
          id: schedule.id,
          title: `${names} · ${schedule.location}`,
          description: schedule.note ?? names,
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
    [calendarSchedules]
  );

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || isDesktop || !hasNextPage) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '240px' }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [isDesktop, fetchNextPage, hasNextPage, isFetchingNextPage]);
  const currentAndUpcoming = schedules.filter((schedule) => {
    const { endsAt } = scheduleTimes(schedule);
    return !endsAt.isBefore(now);
  });
  const completed = schedules.filter((schedule) => scheduleTimes(schedule).endsAt.isBefore(now));

  return (
    <Container maxWidth={false} sx={{ pb: 5 }}>
      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h3">
          เวรของฉัน
        </Typography>
        <Typography sx={{ mt: 1, color: 'text.secondary' }}>
          ตรวจสอบวัน เวลา จุดปฏิบัติงาน และครูที่ปฏิบัติหน้าที่ร่วมกัน
        </Typography>
      </Box>

      {(mobileRosterQuery.isError || calendarRosterQuery.isError) && (
        <Alert severity="error">
          {mobileRosterQuery.error?.message ?? calendarRosterQuery.error?.message}
        </Alert>
      )}

      {isDesktop && (
        <Box>
          {!calendarRosterQuery.isLoading && !calendarSchedules.length ? (
            <EmptyDutyRoster />
          ) : (
            <DutyCalendarView
              embedded
              editable={false}
              events={calendarEvents}
              loading={calendarRosterQuery.isLoading}
              showCreateButton={false}
              onEventClick={(eventId) => router.push(paths.teacher.dutyOperation(eventId))}
            />
          )}
        </Box>
      )}

      {!isDesktop && (
        <Box>
          {mobileRosterQuery.isLoading && (
            <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}>
              <CircularProgress />
            </Box>
          )}
          {!mobileRosterQuery.isLoading && !schedules.length && <EmptyDutyRoster />}

          {!!currentAndUpcoming.length && (
            <Box>
              <Typography variant="h5" sx={{ mb: 2 }}>
                เวรวันนี้และเวรถัดไป
              </Typography>
              <Box sx={{ gap: 2, display: 'grid' }}>
                {currentAndUpcoming.map((schedule) => (
                  <DutyCard
                    key={schedule.id}
                    schedule={schedule}
                    now={now}
                    onClick={() => router.push(paths.teacher.dutyOperation(schedule.id))}
                  />
                ))}
              </Box>
            </Box>
          )}

          {!!completed.length && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h5" sx={{ mb: 2 }}>
                เวรที่ผ่านมา
              </Typography>
              <Box sx={{ gap: 2, display: 'grid' }}>
                {completed
                  .slice()
                  .reverse()
                  .map((schedule) => (
                    <DutyCard
                      key={schedule.id}
                      schedule={schedule}
                      now={now}
                      onClick={() => router.push(paths.teacher.dutyOperation(schedule.id))}
                    />
                  ))}
              </Box>
            </Box>
          )}

          <Box ref={loadMoreRef} sx={{ py: 3, display: 'grid', placeItems: 'center' }}>
            {mobileRosterQuery.isFetchingNextPage && <CircularProgress size={28} />}
            {!mobileRosterQuery.hasNextPage && !!schedules.length && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                แสดงรายการทั้งหมดแล้ว
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Container>
  );
}

function EmptyDutyRoster() {
  return (
    <Card variant="outlined" sx={{ p: 7, textAlign: 'center' }}>
      <RemixIcon
        icon="solar:calendar-minimalistic-bold"
        width={52}
        sx={{ color: 'text.disabled' }}
      />
      <Typography variant="h6" sx={{ mt: 1 }}>
        ยังไม่มีเวรที่ได้รับมอบหมาย
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        เมื่อผู้ดูแลโรงเรียนจัดตารางแล้ว รายการจะแสดงที่หน้านี้
      </Typography>
    </Card>
  );
}
