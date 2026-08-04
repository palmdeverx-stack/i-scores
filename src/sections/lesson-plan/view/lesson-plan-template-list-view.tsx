'use client';

import type { LessonPlan } from '../lesson-plan-actions';
import type { TemplateType, LessonTemplate, TemplateStatus } from 'src/features/templates/types';

import { useDebounce } from 'minimal-shared/hooks';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { TemplatePreview } from 'src/features/templates/components/template-preview';
import {
  applyTemplate,
  deleteTemplate,
  templateAction,
  getTemplatesPage,
  getTemplateOptions,
} from 'src/features/templates/template-actions';
import {
  GRADE_LEVELS,
  TEMPLATE_TYPES,
  TEMPLATE_TYPE_LABELS,
  TEMPLATE_SCOPE_LABELS,
  TEMPLATE_STATUS_LABELS,
} from 'src/features/templates/constants';

import { toast } from 'src/components/snackbar';
import { RemixIcon } from 'src/components/remix-icon';

import { listLessonPlans, listLessonPlanTemplates } from '../lesson-plan-actions';

type CatalogTab = 'all' | 'mine' | 'school' | 'system' | 'marketplace';

const PAGE_SIZE = 12;

const CATALOG_TABS: Array<{ value: CatalogTab; label: string }> = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'mine', label: 'ของฉัน' },
  { value: 'school', label: 'โรงเรียน' },
  { value: 'system', label: 'ระบบ' },
  { value: 'marketplace', label: 'Marketplace' },
];

function subjectLabel(plan: LessonPlan) {
  const subject = plan.teacher_assignment?.subject;
  return [subject?.code, subject?.name].filter(Boolean).join(' · ') || 'ไม่ระบุรายวิชา';
}

function TemplateCard({
  template,
  onPreview,
  onApply,
  onAction,
}: {
  template: LessonTemplate;
  onPreview: () => void;
  onApply: () => void;
  onAction: (action: 'duplicate' | 'archive' | 'restore' | 'delete') => void;
}) {
  return (
    <Card
      variant="outlined"
      sx={{ p: 2.5, gap: 1.5, display: 'flex', flexDirection: 'column', contentVisibility: 'auto' }}
    >
      <Box sx={{ gap: 0.75, display: 'flex', flexWrap: 'wrap' }}>
        <Chip
          size="small"
          color="primary"
          variant="soft"
          label={TEMPLATE_TYPE_LABELS[template.template_type]}
        />
        <Chip size="small" variant="outlined" label={TEMPLATE_SCOPE_LABELS[template.scope]} />
        <Chip
          size="small"
          color={
            template.status === 'active'
              ? 'success'
              : template.status === 'archived'
                ? 'default'
                : 'warning'
          }
          variant="soft"
          label={TEMPLATE_STATUS_LABELS[template.status]}
        />
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h6">{template.name}</Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.5,
            display: '-webkit-box',
            overflow: 'hidden',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {template.description || 'ไม่มีคำอธิบาย'}
        </Typography>
      </Box>
      <Box sx={{ gap: 0.5, display: 'flex', flexWrap: 'wrap' }}>
        {template.tags.slice(0, 4).map((tag) => (
          <Chip key={tag} size="small" label={tag} />
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary">
        ใช้แล้ว {template.usage_count.toLocaleString('th-TH')} ครั้ง · แก้ไข{' '}
        {fDate(template.updated_at)}
      </Typography>
      <Box sx={{ gap: 0.75, display: 'flex', flexWrap: 'wrap' }}>
        <Button size="small" onClick={onPreview}>
          ดู
        </Button>
        {template.can_edit ? (
          <Button
            size="small"
            component={RouterLink}
            href={paths.teacher.lessonPlans.templateEdit(template.id)}
          >
            แก้ไข
          </Button>
        ) : null}
        <Button size="small" onClick={() => onAction('duplicate')}>
          คัดลอก
        </Button>
        {template.status === 'active' ? (
          <Button size="small" variant="contained" onClick={onApply}>
            นำไปใช้
          </Button>
        ) : null}
        {template.can_edit ? (
          <Button
            size="small"
            color="inherit"
            onClick={() => onAction(template.status === 'archived' ? 'restore' : 'archive')}
          >
            {template.status === 'archived' ? 'กู้คืน' : 'เก็บถาวร'}
          </Button>
        ) : null}
        {template.can_edit ? (
          <Button size="small" color="error" onClick={() => onAction('delete')}>
            ลบ
          </Button>
        ) : null}
      </Box>
    </Card>
  );
}

export function LessonPlanTemplateListView() {
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [tab, setTab] = useState<CatalogTab>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [templateType, setTemplateType] = useState<TemplateType | ''>('');
  const [status, setStatus] = useState<TemplateStatus | ''>('');
  const [subjectId, setSubjectId] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [preview, setPreview] = useState<LessonTemplate | null>(null);
  const [applyTarget, setApplyTarget] = useState<LessonTemplate | null>(null);
  const [lessonPlanId, setLessonPlanId] = useState('');

  const filters = {
    tab,
    search: debouncedSearch || undefined,
    templateType: templateType || undefined,
    status: status || undefined,
    subjectId: subjectId || undefined,
    gradeLevel: gradeLevel || undefined,
  };
  const templatesQuery = useInfiniteQuery({
    queryKey: ['lesson-templates', filters],
    queryFn: ({ pageParam }) => getTemplatesPage(filters, { limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextOffset : undefined),
  });
  const optionsQuery = useQuery({
    queryKey: ['lesson-template-options'],
    queryFn: getTemplateOptions,
  });
  const plansQuery = useQuery({
    queryKey: ['lesson-plans', 'mine', 'template-apply'],
    queryFn: () => listLessonPlans('mine'),
    enabled: !!applyTarget,
  });
  const legacyQuery = useQuery({
    queryKey: ['lesson-plan-templates', 'legacy'],
    queryFn: listLessonPlanTemplates,
  });

  const templates = templatesQuery.data?.pages.flatMap((page) => page.templates) ?? [];
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = templatesQuery;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadMore();
      },
      { rootMargin: '300px 0px' }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore]);

  const actionMutation = useMutation({
    mutationFn: async ({
      template,
      action,
    }: {
      template: LessonTemplate;
      action: 'duplicate' | 'archive' | 'restore' | 'delete';
    }) => {
      if (action === 'delete') {
        if (!window.confirm(`ลบ “${template.name}” ถาวรหรือไม่?`)) return false;
        await deleteTemplate(template.id);
      } else await templateAction(template.id, action);
      return true;
    },
    onSuccess: async (changed) => {
      if (!changed) return;
      toast.success('ดำเนินการเรียบร้อย');
      await queryClient.invalidateQueries({ queryKey: ['lesson-templates'] });
    },
    onError: (error) => toast.error(error.message),
  });

  const applyMutation = useMutation({
    mutationFn: () =>
      applyTemplate({
        templateId: applyTarget!.id,
        targetType: 'lesson_plan',
        targetId: lessonPlanId,
      }),
    onSuccess: async () => {
      toast.success('นำ Template ไปใช้กับแผนแล้ว');
      setApplyTarget(null);
      setLessonPlanId('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['lesson-plans'] }),
        queryClient.invalidateQueries({ queryKey: ['lesson-templates'] }),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
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
            Template แผนการสอน
          </Typography>
          <Typography color="text.secondary">
            คลังองค์ประกอบแยกส่วน และแผนที่ผ่านการอนุมัติ
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          href={paths.teacher.lessonPlans.templateNew}
          variant="contained"
          startIcon={<RemixIcon icon="mingcute:add-line" />}
        >
          สร้าง Template
        </Button>
      </Box>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, value: CatalogTab) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {CATALOG_TABS.map((item) => (
            <Tab key={item.value} value={item.value} label={item.label} />
          ))}
        </Tabs>
        <Box
          sx={{
            p: 2,
            gap: 1.5,
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: '2fr repeat(4, minmax(150px, 1fr))',
            },
          }}
        >
          <TextField
            size="small"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาชื่อ Template"
            slotProps={{
              input: {
                startAdornment: (
                  <RemixIcon icon="solar:magnifer-linear" sx={{ mr: 1, color: 'text.disabled' }} />
                ),
              },
            }}
          />
          <TextField
            select
            size="small"
            label="ประเภท"
            value={templateType}
            onChange={(event) => setTemplateType(event.target.value as TemplateType | '')}
          >
            <MenuItem value="">ทั้งหมด</MenuItem>
            {TEMPLATE_TYPES.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="รายวิชา"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
          >
            <MenuItem value="">ทั้งหมด</MenuItem>
            {(optionsQuery.data?.subjects ?? []).map((subject) => (
              <MenuItem key={subject.id} value={subject.id}>
                {subject.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="ระดับชั้น"
            value={gradeLevel}
            onChange={(event) => setGradeLevel(event.target.value)}
          >
            <MenuItem value="">ทั้งหมด</MenuItem>
            {GRADE_LEVELS.map((grade) => (
              <MenuItem key={grade} value={grade}>
                {grade}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="สถานะ"
            value={status}
            onChange={(event) => setStatus(event.target.value as TemplateStatus | '')}
          >
            <MenuItem value="">ทั้งหมด</MenuItem>
            <MenuItem value="draft">ฉบับร่าง</MenuItem>
            <MenuItem value="active">ใช้งาน</MenuItem>
            <MenuItem value="archived">เก็บถาวร</MenuItem>
          </TextField>
        </Box>
      </Card>

      {templatesQuery.isLoading ? <LinearProgress /> : null}
      {templatesQuery.isError ? (
        <Alert severity="error">{templatesQuery.error.message}</Alert>
      ) : null}
      {!templatesQuery.isLoading && !templates.length ? (
        <Card variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <RemixIcon icon="solar:documents-linear" sx={{ fontSize: 54 }} />
          <Typography variant="h5" sx={{ mt: 1 }}>
            ไม่พบ Template
          </Typography>
          <Typography color="text.secondary">
            ลองเปลี่ยนตัวกรอง หรือสร้าง Template รายการแรก
          </Typography>
        </Card>
      ) : null}
      <Box
        sx={{
          gap: 2,
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, minmax(0, 1fr))',
            xl: 'repeat(3, minmax(0, 1fr))',
          },
        }}
      >
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onPreview={() => setPreview(template)}
            onApply={() => setApplyTarget(template)}
            onAction={(action) => actionMutation.mutate({ template, action })}
          />
        ))}
      </Box>

      <Box ref={loadMoreRef} sx={{ minHeight: 8, mt: 2 }}>
        {templatesQuery.isFetchingNextPage ? <LinearProgress /> : null}
        {!templatesQuery.hasNextPage && templates.length ? (
          <Typography variant="body2" color="text.secondary" align="center">
            แสดง Template ครบทั้งหมดแล้ว
          </Typography>
        ) : null}
      </Box>

      {legacyQuery.data?.length ? (
        <Box sx={{ mt: 5 }}>
          <Typography variant="h4">แผนการสอนที่อนุมัติแล้ว (รูปแบบเดิม)</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            ยังใช้งาน Template ทั้งฉบับเดิมได้ตามปกติ
          </Typography>
          <Box
            sx={{
              gap: 2,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' },
            }}
          >
            {legacyQuery.data.slice(0, 12).map((plan) => (
              <Card key={plan.id} variant="outlined" sx={{ p: 2.5 }}>
                <Chip size="small" label="แผนทั้งฉบับเดิม" />
                <Typography variant="h6" sx={{ mt: 1 }}>
                  {plan.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {subjectLabel(plan)} · {plan.duration_periods} คาบ
                </Typography>
                <Button
                  sx={{ mt: 2 }}
                  component={RouterLink}
                  href={`${paths.teacher.lessonPlans.new}?template=${plan.id}`}
                  variant="outlined"
                >
                  ใช้แผนนี้
                </Button>
              </Card>
            ))}
          </Box>
        </Box>
      ) : null}

      <Dialog open={!!preview} onClose={() => setPreview(null)} fullWidth maxWidth="md">
        <DialogTitle>{preview?.name}</DialogTitle>
        <DialogContent dividers>
          {preview ? (
            <TemplatePreview
              templateType={preview.template_type}
              content={preview.content as Record<string, unknown>}
            />
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreview(null)}>ปิด</Button>
          {preview?.status === 'active' ? (
            <Button
              variant="contained"
              onClick={() => {
                setApplyTarget(preview);
                setPreview(null);
              }}
            >
              นำไปใช้
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog open={!!applyTarget} onClose={() => setApplyTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>นำ “{applyTarget?.name}” ไปใช้</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            เนื้อหาจะถูกคัดลอกไปยัง Section ที่เกี่ยวข้อง แก้ไขในแผนภายหลังได้โดยไม่กระทบต้นฉบับ
          </Typography>
          <TextField
            select
            fullWidth
            label="เลือกแผนการสอน"
            value={lessonPlanId}
            onChange={(event) => setLessonPlanId(event.target.value)}
          >
            {(plansQuery.data ?? [])
              .filter((plan) => ['draft', 'revision'].includes(plan.status))
              .map((plan) => (
                <MenuItem key={plan.id} value={plan.id}>
                  {plan.title}
                </MenuItem>
              ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApplyTarget(null)}>ยกเลิก</Button>
          <Button
            variant="contained"
            disabled={!lessonPlanId}
            loading={applyMutation.isPending}
            onClick={() => applyMutation.mutate()}
          >
            นำไปใช้
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
