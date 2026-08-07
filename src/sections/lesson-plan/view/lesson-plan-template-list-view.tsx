'use client';

import type { LessonPlan } from '../lesson-plan-actions';
import type {
  TemplateType,
  LessonTemplate,
  TemplateStatus,
  TemplateFilters,
  TemplateCatalogTab,
} from 'src/features/templates/types';

import dynamic from 'next/dynamic';
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
import Drawer from '@mui/material/Drawer';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { TemplatePreview } from 'src/features/templates/components/template-preview';
import {
  GRADE_LEVELS,
  TEMPLATE_TYPES,
  TEMPLATE_TYPE_LABELS,
  TEMPLATE_SCOPE_LABELS,
  TEMPLATE_STATUS_LABELS,
} from 'src/features/templates/constants';
import {
  applyTemplate,
  deleteTemplate,
  templateAction,
  getTemplatesPage,
  getTemplateOptions,
  getTemplateDocument,
} from 'src/features/templates/template-actions';

import { toast } from 'src/components/snackbar';
import { RemixIcon } from 'src/components/remix-icon';

import { LessonPlanDocumentCard } from '../components/lesson-plan-document-card';
import { listLessonPlans, listLessonPlanTemplates } from '../lesson-plan-actions';

const LessonPlanTemplatePdfViewer = dynamic(
  () => import('../components/lesson-plan-template-pdf-viewer'),
  {
    ssr: false,
    loading: () => <LinearProgress sx={{ gridColumn: { lg: '1 / span 2' }, m: 3 }} />,
  }
);

type CatalogTab = TemplateCatalogTab;

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
  editHref,
  onPreview,
  onApply,
  onAction,
}: {
  template: LessonTemplate;
  editHref: string;
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
        <Chip
          size="small"
          color={template.scope === 'personal' ? 'info' : 'default'}
          variant={template.scope === 'personal' ? 'soft' : 'outlined'}
          label={template.scope === 'personal' ? 'ของฉัน' : TEMPLATE_SCOPE_LABELS[template.scope]}
        />
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
        {Array.from(new Set(template.tags))
          .slice(0, 4)
          .map((tag) => (
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
          <Button size="small" component={RouterLink} href={editHref}>
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

type TemplateAction = 'duplicate' | 'archive' | 'restore' | 'delete' | 'edit-copy';

function FullPlanTemplateReader({
  templates,
  selectedTemplate,
  onSelect,
  onApply,
  onAction,
}: {
  templates: LessonTemplate[];
  selectedTemplate: LessonTemplate;
  onSelect: (template: LessonTemplate) => void;
  onApply: (template: LessonTemplate) => void;
  onAction: (template: LessonTemplate, action: TemplateAction) => void;
}) {
  const [pdfDownload, setPdfDownload] = useState<{ templateId: string; url: string } | null>(null);
  const downloadUrl = pdfDownload?.templateId === selectedTemplate.id ? pdfDownload.url : undefined;
  const handlePdfReady = useCallback(
    (url: string) =>
      setPdfDownload((current) =>
        current?.templateId === selectedTemplate.id && current.url === url
          ? current
          : { templateId: selectedTemplate.id, url }
      ),
    [selectedTemplate.id]
  );
  const documentQuery = useQuery({
    queryKey: ['lesson-template-document', selectedTemplate.id],
    queryFn: () => getTemplateDocument(selectedTemplate.id),
  });
  const recommendations = templates
    .filter((template) => template.id !== selectedTemplate.id)
    .slice(0, 6);

  return (
    <Box sx={{ gap: 2, display: 'grid', alignItems: 'start' }}>
      <Card variant="outlined" sx={{ minWidth: 0, overflow: 'hidden' }}>
        <Box
          sx={{
            px: { xs: 2, md: 3 },
            py: 1.5,
            gap: 1,
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            flexDirection: { xs: 'column', sm: 'row' },
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="h6">{selectedTemplate.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              ใช้แล้ว {selectedTemplate.usage_count.toLocaleString('th-TH')} ครั้ง · อัปเดต{' '}
              {fDate(selectedTemplate.updated_at)} · PDF จากข้อมูลจริง
            </Typography>
            <Box sx={{ gap: 0.75, mt: 1, display: 'flex', flexWrap: 'wrap' }}>
              <Chip size="small" color="primary" variant="soft" label="แผนการสอนทั้งฉบับ" />
              <Chip
                size="small"
                color={selectedTemplate.scope === 'personal' ? 'info' : 'default'}
                variant={selectedTemplate.scope === 'personal' ? 'soft' : 'outlined'}
                label={
                  selectedTemplate.scope === 'personal'
                    ? 'ของฉัน'
                    : TEMPLATE_SCOPE_LABELS[selectedTemplate.scope]
                }
              />
              <Chip
                size="small"
                color={
                  selectedTemplate.status === 'active'
                    ? 'success'
                    : selectedTemplate.status === 'archived'
                      ? 'default'
                      : 'warning'
                }
                variant="soft"
                label={TEMPLATE_STATUS_LABELS[selectedTemplate.status]}
              />
            </Box>
          </Box>
          <Box sx={{ gap: 0.75, display: 'flex', flexWrap: 'wrap' }}>
            <Button
              size="small"
              component="a"
              href={downloadUrl}
              disabled={!downloadUrl}
              download={`${selectedTemplate.name.replace(/[\\/:*?"<>|]/g, '-')}.pdf`}
              startIcon={<RemixIcon icon="solar:download-minimalistic-bold" />}
            >
              ดาวน์โหลด PDF
            </Button>
            {selectedTemplate.can_edit ? (
              <Button
                size="small"
                component={RouterLink}
                href={paths.teacher.lessonPlans.templateEdit(selectedTemplate.id)}
                startIcon={<RemixIcon icon="solar:pen-linear" />}
              >
                แก้ไข
              </Button>
            ) : (
              <Button
                size="small"
                onClick={() => onAction(selectedTemplate, 'edit-copy')}
                startIcon={<RemixIcon icon="solar:pen-linear" />}
              >
                คัดลอกเพื่อแก้ไข
              </Button>
            )}
            <Button
              size="small"
              onClick={() => onAction(selectedTemplate, 'duplicate')}
              startIcon={<RemixIcon icon="solar:copy-linear" />}
            >
              คัดลอก
            </Button>
            {selectedTemplate.status === 'active' || selectedTemplate.can_edit ? (
              <Button
                size="small"
                variant="contained"
                onClick={() => onApply(selectedTemplate)}
                startIcon={<RemixIcon icon="solar:document-add-linear" />}
              >
                ใช้ Template นี้
              </Button>
            ) : null}
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            bgcolor: 'grey.100',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              lg: '190px minmax(0, 1fr)',
            },
          }}
        >
          {documentQuery.isLoading ? (
            <LinearProgress sx={{ gridColumn: { lg: '1 / span 2' }, m: 3 }} />
          ) : null}
          {documentQuery.isError ? (
            <Alert severity="error" sx={{ gridColumn: { lg: '1 / span 2' }, m: 2 }}>
              {documentQuery.error.message}
            </Alert>
          ) : null}
          {documentQuery.data ? (
            <LessonPlanTemplatePdfViewer
              template={documentQuery.data.template}
              sectionTemplates={documentQuery.data.sectionTemplates}
              onPdfReady={handlePdfReady}
            />
          ) : null}
        </Box>
      </Card>

      {recommendations.length ? (
        <Box component="section">
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            เนื้อหาใกล้เคียง
          </Typography>
          <Box
            sx={{
              gap: 2,
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                md: 'repeat(2, minmax(0, 1fr))',
              },
              '@media (min-width:1440px)': {
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              },
              '@media (min-width:1650px)': {
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              },
            }}
          >
            {recommendations.map((template) => (
              <LessonPlanDocumentCard
                key={template.id}
                compact
                data={{
                  title: template.name,
                  unitName: template.description,
                  previewText: template.description,
                  sectionCount: Array.isArray((template.content as { sections?: unknown }).sections)
                    ? (template.content as { sections: unknown[] }).sections.length
                    : undefined,
                  versionNumber: template.version,
                  status: {
                    label: TEMPLATE_STATUS_LABELS[template.status],
                    color:
                      template.status === 'active'
                        ? 'success'
                        : template.status === 'draft'
                          ? 'warning'
                          : 'default',
                  },
                  caption:
                    [template.subject?.name, ...template.grade_levels]
                      .filter(Boolean)
                      .join(' · ') || 'ใช้ได้ทุกระดับชั้น',
                }}
                onOpen={() => onSelect(template)}
              />
            ))}
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}

export function LessonPlanTemplateListView({
  catalogMode = 'all',
}: {
  catalogMode?: 'full-plan' | 'all';
}) {
  const isFullPlanCatalog = catalogMode === 'full-plan';
  const router = useRouter();
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [tab, setTab] = useState<CatalogTab>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [templateType, setTemplateType] = useState<TemplateType | ''>(
    isFullPlanCatalog ? 'lesson_plan' : ''
  );
  const [status, setStatus] = useState<TemplateStatus | ''>('');
  const [subjectId, setSubjectId] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [preview, setPreview] = useState<LessonTemplate | null>(null);
  const [applyTarget, setApplyTarget] = useState<LessonTemplate | null>(null);
  const [lessonPlanId, setLessonPlanId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const filters: TemplateFilters = {
    tab,
    search: debouncedSearch || undefined,
    templateType: isFullPlanCatalog ? 'lesson_plan' : templateType || undefined,
    excludeTemplateType: isFullPlanCatalog ? undefined : 'lesson_plan',
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
    enabled: isFullPlanCatalog,
  });

  const templates = templatesQuery.data?.pages.flatMap((page) => page.templates) ?? [];
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? templates[0];
  const tabCounts = templatesQuery.data?.pages[0]?.tabCounts;
  const activeFilterCount =
    Number(tab !== 'all') +
    Number(!!search.trim()) +
    Number(!isFullPlanCatalog && !!templateType) +
    Number(!!subjectId) +
    Number(!!gradeLevel) +
    Number(!!status);
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
      action: TemplateAction;
    }) => {
      if (action === 'delete') {
        if (!window.confirm(`ลบ “${template.name}” ถาวรหรือไม่?`))
          return { changed: false, editTemplateId: null };
        await deleteTemplate(template.id);
        return { changed: true, editTemplateId: null };
      }
      const result = await templateAction(
        template.id,
        action === 'edit-copy' ? 'duplicate' : action
      );
      return {
        changed: true,
        editTemplateId: action === 'edit-copy' ? result.template.id : null,
      };
    },
    onSuccess: async ({ changed, editTemplateId }) => {
      if (!changed) return;
      toast.success('ดำเนินการเรียบร้อย');
      await queryClient.invalidateQueries({ queryKey: ['lesson-templates'] });
      if (editTemplateId) router.push(paths.teacher.lessonPlans.templateEdit(editTemplateId));
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
    <Container maxWidth={false} sx={{ py: 3 }}>
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
            {isFullPlanCatalog ? 'เทมเพลตแผนการสอน' : 'รวมเทมเพลตทุกประเภท'}
          </Typography>
          <Typography color="text.secondary">
            {isFullPlanCatalog
              ? 'เลือกโครงแผนฉบับเต็มที่ประกอบ Section พร้อมใช้งาน'
              : 'คลังองค์ประกอบสำหรับนำไปใช้ซ้ำในแต่ละส่วนของแผนการสอน'}
          </Typography>
        </Box>
        <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap' }}>
          <Button
            variant={activeFilterCount ? 'contained' : 'outlined'}
            color={activeFilterCount ? 'primary' : 'inherit'}
            onClick={() => setFilterOpen(true)}
            startIcon={<RemixIcon icon="solar:filter-linear" />}
            aria-label={`เปิดการค้นหาและตัวกรอง${activeFilterCount ? ` ใช้งานอยู่ ${activeFilterCount} รายการ` : ''}`}
          >
            ค้นหาและตัวกรอง{activeFilterCount ? ` (${activeFilterCount})` : ''}
          </Button>
          <Button
            component={RouterLink}
            href={
              isFullPlanCatalog
                ? paths.teacher.lessonPlans.templateNew
                : paths.teacher.lessonPlans.templateLibraryNew
            }
            variant="contained"
            startIcon={<RemixIcon icon="mingcute:add-line" />}
          >
            สร้าง Template
          </Button>
        </Box>
      </Box>

      <Drawer
        anchor="right"
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 10 }}
        slotProps={{
          backdrop: { sx: { zIndex: -1 } },
          paper: { sx: { width: { xs: '100%', sm: 480 } } },
        }}
      >
        <Box
          sx={{
            p: 3,
            gap: 2.5,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h5">ค้นหาและตัวกรอง</Typography>
              <Typography variant="body2" color="text.secondary">
                เลือกข้อมูลเพื่อจำกัดรายการที่แสดง
              </Typography>
            </Box>
            <Button size="small" color="inherit" onClick={() => setFilterOpen(false)}>
              ปิด
            </Button>
          </Box>

          <Box sx={{ mx: -3, borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tab}
              onChange={(_, value: CatalogTab) => setTab(value)}
              variant="scrollable"
              scrollButtons="auto"
            >
              {CATALOG_TABS.map((item) => (
                <Tab
                  key={item.value}
                  value={item.value}
                  label={`${item.label} (${tabCounts?.[item.value] ?? '…'})`}
                />
              ))}
            </Tabs>
          </Box>

          <TextField
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

          {isFullPlanCatalog ? null : (
            <TextField
              select
              label="ประเภท"
              value={templateType}
              onChange={(event) => setTemplateType(event.target.value as TemplateType | '')}
            >
              <MenuItem value="">ทั้งหมด</MenuItem>
              {TEMPLATE_TYPES.filter((item) => item.value !== 'lesson_plan').map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            select
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
            label="สถานะ"
            value={status}
            onChange={(event) => setStatus(event.target.value as TemplateStatus | '')}
          >
            <MenuItem value="">ทั้งหมด</MenuItem>
            <MenuItem value="draft">ฉบับร่าง</MenuItem>
            <MenuItem value="active">ใช้งาน</MenuItem>
            <MenuItem value="archived">เก็บถาวร</MenuItem>
          </TextField>

          <Box sx={{ mt: 'auto', gap: 1, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <Button
              color="inherit"
              variant="outlined"
              disabled={!activeFilterCount}
              onClick={() => {
                setTab('all');
                setSearch('');
                if (!isFullPlanCatalog) setTemplateType('');
                setSubjectId('');
                setGradeLevel('');
                setStatus('');
              }}
            >
              ล้างทั้งหมด
            </Button>
            <Button variant="contained" onClick={() => setFilterOpen(false)}>
              ดูผลลัพธ์
            </Button>
          </Box>
        </Box>
      </Drawer>

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
      {isFullPlanCatalog && selectedTemplate ? (
        <FullPlanTemplateReader
          templates={templates}
          selectedTemplate={selectedTemplate}
          onSelect={(template) => setSelectedTemplateId(template.id)}
          onApply={(template) =>
            router.push(
              `${paths.teacher.lessonPlans.new}?catalogTemplate=${encodeURIComponent(template.id)}`
            )
          }
          onAction={(template, action) => actionMutation.mutate({ template, action })}
        />
      ) : (
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
              editHref={paths.teacher.lessonPlans.templateLibraryEdit(template.id)}
              onPreview={() => setPreview(template)}
              onApply={() => setApplyTarget(template)}
              onAction={(action) => actionMutation.mutate({ template, action })}
            />
          ))}
        </Box>
      )}

      <Box ref={loadMoreRef} sx={{ minHeight: 8, mt: 2 }}>
        {templatesQuery.isFetchingNextPage ? <LinearProgress /> : null}
      </Box>

      {isFullPlanCatalog && legacyQuery.data?.length ? (
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
