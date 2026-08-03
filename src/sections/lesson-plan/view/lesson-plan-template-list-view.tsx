'use client';

import type { LessonPlan } from '../lesson-plan-actions';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { RemixIcon } from 'src/components/remix-icon';

import { listLessonPlanTemplates } from '../lesson-plan-actions';
import { richTextToPlainText, assessmentToPlainText } from '../lesson-plan-content';

// ----------------------------------------------------------------------

type TemplatePage = { title: string; content: string };

function teacherName(plan: LessonPlan) {
  const teacher = plan.teacher;
  return [teacher?.first_name, teacher?.last_name].filter(Boolean).join(' ') || 'ครูผู้สอน';
}

function subjectLabel(plan: LessonPlan) {
  const subject = plan.teacher_assignment?.subject;
  return [subject?.code, subject?.name].filter(Boolean).join(' · ') || 'ไม่ระบุรายวิชา';
}

function buildPages(plan: LessonPlan): TemplatePage[] {
  return [
    {
      title: 'ข้อมูลแผนการสอน',
      content: [
        `ชื่อแผน: ${plan.title}`,
        `รายวิชา: ${subjectLabel(plan)}`,
        `หน่วยที่ ${plan.unit_number}: ${plan.unit_name}`,
        `เวลา ${plan.duration_periods} คาบ`,
      ].join('\n'),
    },
    {
      title: '1. มาตรฐานการเรียนรู้ / ตัวชี้วัด',
      content: [
        'มาตรฐานการเรียนรู้',
        plan.learning_standards || 'ไม่ระบุ',
        '',
        'ตัวชี้วัด / ผลการเรียนรู้',
        plan.indicators || 'ไม่ระบุ',
      ].join('\n'),
    },
    { title: '2. จุดประสงค์การเรียนรู้', content: plan.learning_objectives || 'ไม่ระบุ' },
    {
      title: '3. สาระสำคัญ',
      content: richTextToPlainText(plan.essential_content) || 'ไม่ระบุ',
    },
    {
      title: '4. สมรรถนะสำคัญของผู้เรียน',
      content: richTextToPlainText(plan.learner_competencies) || 'ไม่ระบุ',
    },
    {
      title: '5. คุณลักษณะอันพึงประสงค์',
      content: richTextToPlainText(plan.desired_characteristics) || 'ไม่ระบุ',
    },
    {
      title: '6. คำถามหลัก (Big Question)',
      content: richTextToPlainText(plan.guiding_questions) || 'ไม่ระบุ',
    },
    {
      title: '7. กิจกรรมการเรียนรู้',
      content: richTextToPlainText(plan.learning_activities) || 'ไม่ระบุ',
    },
    {
      title: '8. สื่อและการประเมินผล',
      content: [
        'สื่อและแหล่งเรียนรู้',
        plan.learning_media || 'ไม่ระบุ',
        '',
        'การวัดและประเมินผล',
        assessmentToPlainText(plan.assessment) || 'ไม่ระบุ',
      ].join('\n'),
    },
  ];
}

function DocumentThumbnail({
  page,
  index,
  selected,
  onSelect,
}: {
  page: TemplatePage;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {index + 1}
      </Typography>
      <Box
        component="button"
        type="button"
        aria-label={`เปิดหน้า ${index + 1}: ${page.title}`}
        onClick={onSelect}
        sx={{
          p: 1.25,
          mt: 0.5,
          width: '100%',
          minHeight: 150,
          textAlign: 'left',
          cursor: 'pointer',
          bgcolor: 'common.white',
          borderRadius: 1.5,
          border: '2px solid',
          borderColor: selected ? 'primary.main' : 'divider',
          boxShadow: selected ? (theme) => theme.customShadows.z8 : 'none',
        }}
      >
        <Typography variant="caption" sx={{ color: 'grey.900', fontWeight: 700 }}>
          {page.title}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            mt: 1,
            display: '-webkit-box',
            color: 'grey.700',
            overflow: 'hidden',
            whiteSpace: 'pre-line',
            WebkitLineClamp: 7,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {page.content}
        </Typography>
      </Box>
    </Box>
  );
}

function RecommendedTemplate({ plan, onSelect }: { plan: LessonPlan; onSelect: () => void }) {
  return (
    <Card
      component="button"
      type="button"
      variant="outlined"
      onClick={onSelect}
      sx={{ p: 1.25, width: '100%', textAlign: 'left', cursor: 'pointer' }}
    >
      <Box
        sx={{
          p: 1.5,
          height: 135,
          overflow: 'hidden',
          borderRadius: 1,
          color: 'grey.800',
          bgcolor: 'grey.100',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>
          {plan.title}
        </Typography>
        <Typography variant="caption" sx={{ mt: 1, whiteSpace: 'pre-line' }}>
          {plan.learning_objectives ||
            richTextToPlainText(plan.essential_content) ||
            'ตัวอย่างแผนการสอน'}
        </Typography>
      </Box>
      <Typography variant="subtitle2" noWrap sx={{ mt: 1.25 }}>
        {plan.title}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {subjectLabel(plan)} · {teacherName(plan)}
      </Typography>
    </Card>
  );
}

// ----------------------------------------------------------------------

export function LessonPlanTemplateListView() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);

  const templatesQuery = useQuery({
    queryKey: ['lesson-plan-templates'],
    queryFn: listLessonPlanTemplates,
  });

  const templates = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('th');
    if (!keyword) return templatesQuery.data ?? [];
    return (templatesQuery.data ?? []).filter((plan) =>
      [plan.title, plan.unit_name, subjectLabel(plan), teacherName(plan)]
        .join(' ')
        .toLocaleLowerCase('th')
        .includes(keyword)
    );
  }, [search, templatesQuery.data]);

  const selected = templates.find((plan) => plan.id === selectedId) ?? templates[0];
  const pages = selected ? buildPages(selected) : [];
  const activePage = pages[Math.min(pageIndex, Math.max(0, pages.length - 1))];

  const selectTemplate = (id: string) => {
    setSelectedId(id);
    setPageIndex(0);
  };

  if (templatesQuery.isLoading) return <LinearProgress />;

  return (
    <Box sx={{ minHeight: '100vh', pb: 7 }}>
      <Container maxWidth={false} sx={{ pt: 4 }}>
        <Box
          sx={{
            gap: 2,
            mb: 3,
            display: 'flex',
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          <Box>
            <Typography component="h1" variant="h3">
              เทมเพลตแผนการสอน
            </Typography>
            <Typography sx={{ mt: 0.75, color: 'text.secondary' }}>
              เลือกดูแผนที่ผ่านการอนุมัติ แล้วนำไปปรับใช้กับรายวิชาของคุณ
            </Typography>
          </Box>
          <TextField
            size="small"
            value={search}
            placeholder="ค้นหาชื่อแผน รายวิชา หรือผู้สอน"
            onChange={(event) => setSearch(event.target.value)}
            sx={{ width: { xs: '100%', md: 360 }, bgcolor: 'background.paper' }}
            slotProps={{
              input: {
                startAdornment: (
                  <RemixIcon icon="solar:magnifer-linear" sx={{ mr: 1, color: 'text.disabled' }} />
                ),
              },
            }}
          />
        </Box>

        {templatesQuery.isError ? (
          <Alert severity="error">{templatesQuery.error.message}</Alert>
        ) : null}

        {!templatesQuery.isError && !selected ? (
          <Card variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
            <RemixIcon icon="solar:documents-linear" sx={{ mb: 2, fontSize: 56 }} />
            <Typography variant="h5">ยังไม่มีเทมเพลตแผนการสอน</Typography>
            <Typography sx={{ mt: 1, color: 'text.secondary' }}>
              แผนการสอนจะแสดงในหน้านี้เมื่อได้รับการอนุมัติจากฝ่ายวิชาการ
            </Typography>
          </Card>
        ) : null}

        {selected && activePage ? (
          <>
            <Box
              sx={{
                gap: 2,
                mb: 2.5,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <Chip label={subjectLabel(selected)} color="primary" variant="soft" />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                โดย {teacherName(selected)} · {selected.duration_periods} คาบ
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Button
                component={RouterLink}
                href={`${paths.teacher.lessonPlans.new}?template=${selected.id}`}
                variant="contained"
                startIcon={<RemixIcon icon="solar:copy-linear" />}
              >
                ใช้เทมเพลตนี้
              </Button>
            </Box>

            <Box
              sx={{
                gap: 2.5,
                display: 'grid',
                alignItems: 'start',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: '190px minmax(0, 1fr)',
                  xl: '190px minmax(0, 1fr) 320px',
                },
              }}
            >
              <Card
                variant="outlined"
                sx={{
                  p: 1.5,
                  gap: 2,
                  display: 'grid',
                  maxHeight: { md: 'calc(100vh - 210px)' },
                  overflowY: 'auto',
                }}
              >
                {pages.map((page, index) => (
                  <DocumentThumbnail
                    key={page.title}
                    page={page}
                    index={index}
                    selected={index === pageIndex}
                    onSelect={() => setPageIndex(index)}
                  />
                ))}
              </Card>

              <Card variant="outlined" sx={{ p: { xs: 2, sm: 3 }, overflow: 'auto' }}>
                <Box
                  sx={{
                    p: { xs: 3, sm: 6 },
                    mx: 'auto',
                    width: '100%',
                    minHeight: 760,
                    maxWidth: 820,
                    color: 'grey.900',
                    bgcolor: 'common.white',
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: (theme) => theme.customShadows.z16,
                  }}
                >
                  <Box sx={{ mb: 5, textAlign: 'center' }}>
                    <Typography variant="h4">{selected.title}</Typography>
                    <Typography sx={{ mt: 1.5 }}>{subjectLabel(selected)}</Typography>
                    <Typography variant="body2" sx={{ color: 'grey.600' }}>
                      หน่วยที่ {selected.unit_number} {selected.unit_name} ·{' '}
                      {selected.duration_periods} คาบ
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 4, borderColor: 'grey.900' }} />
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    {activePage.title}
                  </Typography>
                  <Typography sx={{ lineHeight: 2, whiteSpace: 'pre-line' }}>
                    {activePage.content}
                  </Typography>
                </Box>
              </Card>

              <Box sx={{ display: { xs: 'none', xl: 'block' } }}>
                <Typography variant="h5" sx={{ mb: 2 }}>
                  แนะนำ
                </Typography>
                <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  {templates
                    .filter((plan) => plan.id !== selected.id)
                    .slice(0, 6)
                    .map((plan) => (
                      <RecommendedTemplate
                        key={plan.id}
                        plan={plan}
                        onSelect={() => selectTemplate(plan.id)}
                      />
                    ))}
                </Box>
              </Box>
            </Box>
          </>
        ) : null}
      </Container>
    </Box>
  );
}
