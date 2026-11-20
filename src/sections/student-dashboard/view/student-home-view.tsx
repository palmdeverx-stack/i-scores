'use client';

import type { StudentHomeDashboard } from '../student-dashboard-actions';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useMainSchoolBrand } from 'src/layouts/main/school-brand';

import { Label } from 'src/components/label';
import { RemixIcon } from 'src/components/remix-icon';

import {
  displayName,
  SectionHeading,
  StudentPageState,
  getCurrentEnrollment,
  useStudentHomeDashboard,
} from './student-dashboard-shared';

// ----------------------------------------------------------------------

const QUICK_LINKS = [
  { label: 'วิชาเรียนของฉัน', href: paths.student.subjects, icon: 'solar:notebook-bold-duotone' },
  { label: 'ตารางเรียน', href: paths.student.timetable, icon: 'solar:calendar-date-bold' },
  {
    label: 'งานที่ได้รับมอบหมาย',
    href: paths.student.assignments,
    icon: 'solar:file-check-bold-duotone',
  },
] as const;

export function StudentHomeView() {
  const { data, isLoading, isError, refetch } = useStudentHomeDashboard();
  const { school, studentWorkspaceName } = useMainSchoolBrand();
  const workspaceDescription = studentWorkspaceName && school?.workspace_description;

  if (isLoading || isError || !data) {
    return <StudentPageState isLoading={isLoading} isError={isError || !data} onRetry={refetch} />;
  }

  const currentEnrollment = getCurrentEnrollment(data);
  const currentRank = data.ranking.find(
    (row) => row.is_current_student && row.full_score > 0
  )?.rank;

  const classroomDetails = currentEnrollment
    ? [
        `ห้อง ${currentEnrollment.classroom.name}`,
        currentEnrollment.student_number && `เลขที่ ${currentEnrollment.student_number}`,
        currentEnrollment.classroom.academic_year?.year &&
          `ปีการศึกษา ${currentEnrollment.classroom.academic_year.year}`,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'ยังไม่มีห้องเรียนที่ลงทะเบียน';
  const stats = [
    {
      label: 'อันดับของฉัน',
      value: currentRank ? `#${currentRank}` : '–',
      icon: 'solar:cup-star-bold',
    },
    {
      label: 'เพื่อนในห้อง',
      value: data.class_members.filter((member) => !member.is_current_student).length,
      icon: 'solar:users-group-rounded-bold',
    },
    { label: 'ประกาศใหม่', value: data.announcements.length, icon: 'solar:bell-bing-bold' },
  ] as const;

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 2, sm: 3 }, pb: { xs: 3, md: 5 }, minHeight: '70vh' }}>
      <Stack spacing={{ xs: 2, sm: 2.5 }}>
        <Card
          variant="outlined"
          component="section"
          aria-labelledby="student-home-title"
          sx={{
            p: { xs: 2, sm: 3 },
            display: 'grid',
            gap: { xs: 2.5, md: 3 },
            alignItems: 'center',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              md: 'minmax(0, 1fr) minmax(360px, 0.9fr)',
            },
            borderRadius: 3,
            background: (theme) =>
              `linear-gradient(120deg, ${theme.vars.palette.primary.lighter}, ${theme.vars.palette.background.paper} 78%)`,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={{ xs: 1.5, sm: 2 }}
            sx={{ minWidth: 0 }}
          >
            <Avatar
              src={data.student.avatar_url ?? undefined}
              aria-hidden
              sx={{
                width: { xs: 52, sm: 64 },
                height: { xs: 52, sm: 64 },
                flexShrink: 0,
                fontSize: { xs: 22, sm: 26 },
                fontWeight: 700,
                color: 'primary.darker',
                bgcolor: 'background.paper',
              }}
            >
              {(data.student.first_name ?? data.student.username).slice(0, 1).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                id="student-home-title"
                component="h1"
                variant="h4"
                sx={{ overflowWrap: 'anywhere' }}
              >
                {displayName(data.student)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {classroomDetails}
              </Typography>
            </Box>
          </Stack>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
              '& > * + *': { borderInlineStart: '1px solid', borderColor: 'divider' },
            }}
          >
            {stats.map(({ label, value, icon }) => (
              <Box key={label} sx={{ p: { xs: 1, sm: 1.5 }, minWidth: 0, textAlign: 'center' }}>
                <Box
                  sx={{
                    gap: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.main',
                  }}
                >
                  <RemixIcon icon={icon} width={16} aria-hidden />
                  <Typography variant="h6" color="text.primary" sx={{ lineHeight: 1.35 }}>
                    {value}
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.25 }}
                >
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Card>

        <Box
          component="nav"
          aria-label="ทางลัดการเรียน"
          sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
        >
          {QUICK_LINKS.map(({ label, href, icon }) => (
            <Card key={href} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardActionArea
                component={RouterLink}
                href={href}
                sx={{
                  height: 1,
                  p: { xs: 1.25, sm: 1.5 },
                  gap: { xs: 0.5, sm: 1.25 },
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'center', sm: 'center' },
                  textAlign: { xs: 'center', sm: 'start' },
                  justifyContent: { xs: 'flex-start', sm: 'flex-start' },
                  '&.Mui-focusVisible': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: -2,
                  },
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    display: 'grid',
                    flexShrink: 0,
                    placeItems: 'center',
                    borderRadius: 1,
                    color: 'primary.main',
                    bgcolor: 'primary.lighter',
                  }}
                >
                  <RemixIcon icon={icon} width={18} aria-hidden />
                </Box>
                <Typography
                  variant="subtitle2"
                  sx={{ fontSize: { xs: 12, sm: 14 }, lineHeight: 1.4 }}
                >
                  {label}
                </Typography>
              </CardActionArea>
            </Card>
          ))}
        </Box>

        {workspaceDescription ? (
          <Card variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2.5 }}>
            <Typography component="h2" variant="subtitle1">
              {studentWorkspaceName}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}
            >
              {workspaceDescription}
            </Typography>
          </Card>
        ) : null}

        <Box
          sx={{
            gap: { xs: 2, sm: 2.5 },
            display: 'grid',
            alignItems: 'start',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.25fr) minmax(0, 1fr)' },
          }}
        >
          <RankingSection
            ranking={data.ranking}
            subjectRankings={data.subject_rankings}
            classroomName={currentEnrollment?.classroom.name}
          />
          <AnnouncementsSection announcements={data.announcements} />
        </Box>
      </Stack>
    </Container>
  );
}

// ----------------------------------------------------------------------

function RankingSection({
  ranking,
  subjectRankings,
  classroomName,
}: {
  ranking: StudentHomeDashboard['ranking'];
  subjectRankings: StudentHomeDashboard['subject_rankings'];
  classroomName?: string;
}) {
  const [rankingView, setRankingView] = useState<'overall' | 'subject'>('overall');
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjectRankings[0]?.id ?? '');
  const selectedSubject =
    subjectRankings.find((item) => item.id === selectedSubjectId) ?? subjectRankings[0];
  const isOverall = rankingView === 'overall';

  return (
    <Card
      component="section"
      aria-label="อันดับการเรียน"
      variant="outlined"
      sx={{ p: { xs: 2, sm: 2.5 }, minWidth: 0, borderRadius: 2.5 }}
    >
      <SectionHeading
        compact
        icon="solar:cup-star-bold"
        title="อันดับการเรียน"
        subtitle={classroomName ? `ห้อง ${classroomName}` : 'คะแนนรวมและอันดับรายวิชา'}
      />
      <Tabs
        value={rankingView}
        onChange={(_, value: 'overall' | 'subject') => setRankingView(value)}
        aria-label="ประเภทอันดับการเรียน"
        variant="fullWidth"
        sx={{ mb: 1.5, minHeight: 40, '& .MuiTab-root': { minHeight: 40 } }}
      >
        <Tab
          id="ranking-tab-overall"
          aria-controls="ranking-panel-overall"
          value="overall"
          label="อันดับรวม"
        />
        <Tab
          id="ranking-tab-subject"
          aria-controls="ranking-panel-subject"
          value="subject"
          label="อันดับรายวิชา"
        />
      </Tabs>

      <Box
        role="tabpanel"
        id="ranking-panel-overall"
        aria-labelledby="ranking-tab-overall"
        hidden={!isOverall}
      >
        {isOverall ? (
          <RankingList
            ranking={ranking}
            emptyText="ยังไม่มีคะแนนสำหรับคำนวณอันดับรวม"
            note="คำนวณจากงานทั้งหมดของทุกวิชา · งานที่ยังไม่มีคะแนนนับเป็น 0 คะแนน"
          />
        ) : null}
      </Box>
      <Box
        role="tabpanel"
        id="ranking-panel-subject"
        aria-labelledby="ranking-tab-subject"
        hidden={isOverall}
      >
        {!isOverall && selectedSubject ? (
          <>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1.75 }}>
              {subjectRankings.map((item) => (
                <Chip
                  clickable
                  key={item.id}
                  label={item.subject.code || item.subject.name}
                  title={`${item.subject.name} · ${item.semester.name}`}
                  color={selectedSubject.id === item.id ? 'primary' : 'default'}
                  variant={selectedSubject.id === item.id ? 'filled' : 'outlined'}
                  onClick={() => setSelectedSubjectId(item.id)}
                  aria-pressed={selectedSubject.id === item.id}
                  aria-label={`ดูอันดับวิชา ${item.subject.name}`}
                  sx={{ maxWidth: '100%' }}
                />
              ))}
            </Stack>
            <Typography component="h3" variant="subtitle2" sx={{ mb: 0.25 }}>
              {selectedSubject.subject.name}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 1.25, display: 'block' }}
            >
              {selectedSubject.semester.name}
            </Typography>
            <RankingList
              ranking={selectedSubject.ranking}
              emptyText="วิชานี้ยังไม่มีงานสำหรับคำนวณอันดับ"
              note={`คำนวณจากงานทั้งหมดในวิชา ${selectedSubject.subject.name} · งานที่ยังไม่มีคะแนนนับเป็น 0 คะแนน`}
            />
          </>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            ยังไม่มีรายวิชาสำหรับแสดงอันดับ
          </Typography>
        )}
      </Box>
    </Card>
  );
}

function RankingList({
  ranking,
  emptyText,
  note,
}: {
  ranking: StudentHomeDashboard['ranking'];
  emptyText: string;
  note: string;
}) {
  const visibleRanking = ranking.slice(0, 5);
  const currentStudent = ranking.find((row) => row.is_current_student);
  const hasScoreItems = ranking.some((row) => row.full_score > 0);
  const medalColors = ['warning.main', 'grey.500', 'secondary.dark'];

  if (!hasScoreItems) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        {emptyText}
      </Typography>
    );
  }

  return (
    <>
      <Stack component="ol" spacing={1} sx={{ p: 0, m: 0, listStyle: 'none' }}>
        {visibleRanking.map((row, index) => (
          <Box
            component="li"
            key={row.student.id}
            aria-label={`อันดับ ${row.rank} ${displayName(row.student)} คะแนน ${row.percentage.toFixed(1)} เปอร์เซ็นต์`}
            sx={{
              p: { xs: 1.25, sm: 1.5 },
              gap: 1.25,
              display: 'flex',
              alignItems: 'center',
              borderRadius: 2,
              bgcolor: row.is_current_student ? 'primary.lighter' : 'background.neutral',
              border: '1px solid',
              borderColor: row.is_current_student ? 'primary.light' : 'transparent',
            }}
          >
            <Box
              sx={{
                width: 34,
                height: 34,
                display: 'grid',
                flexShrink: 0,
                borderRadius: '50%',
                placeItems: 'center',
                color: index < 3 ? medalColors[index] : 'text.secondary',
                bgcolor: 'background.paper',
                fontWeight: 800,
              }}
            >
              {index < 3 ? (
                <RemixIcon icon="solar:cup-star-bold" width={19} aria-hidden />
              ) : (
                row.rank
              )}
            </Box>
            <Avatar
              sx={{
                width: 38,
                height: 38,
                fontSize: 15,
                color: row.is_current_student ? 'primary.darker' : 'text.secondary',
                bgcolor: row.is_current_student ? 'primary.lighter' : 'background.paper',
              }}
            >
              {(row.student.first_name ?? row.student.username).slice(0, 1).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle2" noWrap>
                {displayName(row.student)} {row.is_current_student && '(คุณ)'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {row.student_number ? `เลขที่ ${row.student_number}` : 'ยังไม่มีเลขที่'}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="subtitle2" sx={{ color: 'primary.main' }}>
                {row.percentage.toFixed(1)}%
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {row.score}/{row.full_score}
              </Typography>
            </Box>
          </Box>
        ))}
      </Stack>

      {currentStudent && !visibleRanking.some((row) => row.is_current_student) && (
        <Alert severity="info" icon={<RemixIcon icon="solar:cup-star-bold" />} sx={{ mt: 2 }}>
          อันดับของคุณคือ #{currentStudent.rank} · {currentStudent.percentage.toFixed(1)}%
        </Alert>
      )}
      <Typography variant="caption" sx={{ mt: 1.5, display: 'block', color: 'text.secondary' }}>
        {note}
      </Typography>
    </>
  );
}

function AnnouncementsSection({
  announcements,
}: {
  announcements: StudentHomeDashboard['announcements'];
}) {
  const priorityConfig = {
    normal: { label: 'ทั่วไป', color: 'info' as const, border: 'info.main' },
    important: { label: 'สำคัญ', color: 'warning' as const, border: 'warning.main' },
    urgent: { label: 'เร่งด่วน', color: 'error' as const, border: 'error.main' },
  };
  const typeConfig = {
    general: { label: 'ประกาศทั่วไป', icon: 'solar:bell-bing-bold' as const },
    holiday: { label: 'วันหยุด', icon: 'solar:calendar-date-bold' as const },
    exam: { label: 'วันสอบ', icon: 'solar:file-check-bold-duotone' as const },
  };

  return (
    <Card
      component="section"
      aria-label="ประกาศจากโรงเรียน"
      variant="outlined"
      sx={{ p: { xs: 2, sm: 2.5 }, minWidth: 0, borderRadius: 2.5 }}
    >
      <SectionHeading
        compact
        icon="solar:bell-bing-bold"
        title="ประกาศจากโรงเรียน"
        subtitle="ข่าวสารและเรื่องสำคัญที่ควรรู้"
      />

      {announcements.length ? (
        <Stack spacing={1.25}>
          {announcements.map((announcement) => {
            const priority = priorityConfig[announcement.priority];
            const type = typeConfig[announcement.announcement_type];
            return (
              <Box
                component="article"
                key={announcement.id}
                sx={{
                  p: { xs: 1.75, sm: 2 },
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderLeft: `4px solid ${priority.border}`,
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ sm: 'center' }}
                  justifyContent="space-between"
                  sx={{ mb: 0.75 }}
                >
                  <Stack
                    direction="row"
                    spacing={0.75}
                    alignItems="center"
                    useFlexGap
                    flexWrap="wrap"
                  >
                    <Typography
                      component="h3"
                      variant="subtitle1"
                      sx={{ overflowWrap: 'anywhere' }}
                    >
                      {announcement.title}
                    </Typography>
                    <Label variant="soft" color={priority.color}>
                      {priority.label}
                    </Label>
                    <Label
                      variant="outlined"
                      color="default"
                      startIcon={<RemixIcon icon={type.icon} />}
                    >
                      {type.label}
                    </Label>
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0 }}>
                    {new Intl.DateTimeFormat('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }).format(new Date(announcement.published_at))}
                  </Typography>
                </Stack>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    whiteSpace: 'pre-line',
                    lineHeight: 1.75,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {announcement.content}
                </Typography>
                {announcement.image_url && (
                  <Box
                    component="img"
                    src={announcement.image_url}
                    alt={announcement.title}
                    sx={{
                      mt: 2,
                      width: '100%',
                      maxHeight: 320,
                      borderRadius: 2,
                      objectFit: 'cover',
                    }}
                  />
                )}
                {(announcement.event_start || announcement.event_end) && (
                  <Typography
                    variant="caption"
                    sx={{ mt: 1, display: 'block', color: 'text.secondary' }}
                  >
                    กำหนดการ:{' '}
                    {announcement.event_start
                      ? new Intl.DateTimeFormat('th-TH', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(announcement.event_start))
                      : 'ไม่ระบุ'}{' '}
                    –{' '}
                    {announcement.event_end
                      ? new Intl.DateTimeFormat('th-TH', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(announcement.event_end))
                      : 'ไม่ระบุ'}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          ยังไม่มีประกาศใหม่จากโรงเรียน
        </Typography>
      )}
    </Card>
  );
}
