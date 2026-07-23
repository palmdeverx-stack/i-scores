'use client';

import type { Assignment, AssignmentCategory } from 'src/sections/assignment/assignment-actions';

import { memo, useMemo, useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import {
  listAssignments,
  ASSIGNMENT_CATEGORY_META,
} from 'src/sections/assignment/assignment-actions';

import { QuickScoreDialog } from '../quick-score-dialog';
import { ScoreItemActionsDialog } from '../score-item-actions-dialog';

const SCORE_CATEGORY_ORDER: AssignmentCategory[] = [
  'assignment',
  'quiz',
  'midterm',
  'final',
  'other',
];

const SCORE_CATEGORY_ICON = {
  assignment: 'solar:notes-bold-duotone',
  quiz: 'solar:bill-list-bold-duotone',
  midterm: 'solar:notebook-bold-duotone',
  final: 'solar:cup-star-bold',
  other: 'solar:palette-bold-duotone',
} as const satisfies Record<AssignmentCategory, string>;

type Props = {
  teacherAssignmentId: string;
  gradebookPath: (assignmentId: string) => string;
  scoreCategoryNewPath: (category: AssignmentCategory) => string;
};

export const ScoresTab = memo(function ScoresTab({
  teacherAssignmentId,
  gradebookPath,
  scoreCategoryNewPath,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState<AssignmentCategory>('assignment');
  const [scoreItemAction, setScoreItemAction] = useState<{
    mode: 'edit' | 'delete';
    assignment: Assignment;
  } | null>(null);
  const [quickCategory, setQuickCategory] = useState<Exclude<
    AssignmentCategory,
    'assignment'
  > | null>(null);
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['assignments', teacherAssignmentId],
    queryFn: () => listAssignments(teacherAssignmentId),
  });

  const categoryItems = useMemo(
    () => assignments?.filter((assignment) => assignment.category === selectedCategory) ?? [],
    [assignments, selectedCategory]
  );
  const categoryCounts = useMemo(
    () =>
      Object.fromEntries(
        SCORE_CATEGORY_ORDER.map((category) => [
          category,
          assignments?.filter((item) => item.category === category).length ?? 0,
        ])
      ) as Record<AssignmentCategory, number>,
    [assignments]
  );
  const totalFullScore = useMemo(
    () => assignments?.reduce((total, item) => total + item.full_score, 0) ?? 0,
    [assignments]
  );

  return (
    <>
      <Card
        sx={{
          mb: 3,
          overflow: 'hidden',
          border: (theme) => `1px solid ${theme.vars.palette.divider}`,
          boxShadow: (theme) =>
            `0 12px 32px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.08)}`,
        }}
      >
        <Box
          sx={{
            p: { xs: 2.5, sm: 3 },
            gap: 2,
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            bgcolor: (theme) => varAlpha(theme.vars.palette.primary.mainChannel, 0.06),
          }}
        >
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                display: 'grid',
                flexShrink: 0,
                borderRadius: 1.5,
                color: 'primary.main',
                placeItems: 'center',
                bgcolor: (theme) => varAlpha(theme.vars.palette.primary.mainChannel, 0.14),
              }}
            >
              <Iconify icon="solar:chart-square-outline" width={28} />
            </Box>
            <Box>
              <Typography variant="h5">จัดการคะแนน</Typography>
              <Typography variant="body2" sx={{ mt: 0.25, color: 'text.secondary' }}>
                เลือกประเภทคะแนน แล้วเพิ่มรายการหรือกรอกคะแนนนักเรียนได้ทันที
              </Typography>
            </Box>
          </Box>
          <Box sx={{ gap: 1, display: 'flex', width: { xs: 1, sm: 'auto' } }}>
            <Summary label="รายการทั้งหมด" value={`${assignments?.length ?? 0} รายการ`} />
            <Summary label="คะแนนเต็มรวม" value={`${totalFullScore} คะแนน`} />
          </Box>
        </Box>

        <Box
          role="tablist"
          aria-label="ประเภทคะแนน"
          sx={{
            p: 2,
            gap: 1,
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(5, 1fr)' },
          }}
        >
          {SCORE_CATEGORY_ORDER.map((category) => {
            const selected = selectedCategory === category;
            return (
              <Box
                key={category}
                component="button"
                role="tab"
                type="button"
                aria-selected={selected}
                onClick={() => setSelectedCategory(category)}
                sx={{
                  p: 1.5,
                  gap: 1,
                  minWidth: 0,
                  borderRadius: 1.5,
                  cursor: 'pointer',
                  textAlign: 'left',
                  font: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  color: selected ? 'primary.contrastText' : 'text.primary',
                  border: (theme) =>
                    `1px solid ${selected ? theme.vars.palette.primary.main : theme.vars.palette.divider}`,
                  bgcolor: selected ? 'primary.main' : 'background.paper',
                  '&:hover': { bgcolor: selected ? 'primary.dark' : 'action.hover' },
                  '&:last-of-type': { gridColumn: { xs: '1 / -1', md: 'auto' } },
                }}
              >
                <Iconify icon={SCORE_CATEGORY_ICON[category]} width={24} />
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography variant="subtitle2" noWrap>
                    {ASSIGNMENT_CATEGORY_META[category].label}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: selected ? 'inherit' : 'text.secondary', opacity: 0.8 }}
                  >
                    {categoryCounts[category]} รายการ
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Card>

      <ScoreCategorySection
        category={selectedCategory}
        items={categoryItems}
        loading={isLoading}
        gradebookPath={gradebookPath}
        createPath={scoreCategoryNewPath(selectedCategory)}
        onQuickCreate={setQuickCategory}
        onEdit={(assignment) => setScoreItemAction({ mode: 'edit', assignment })}
        onDelete={(assignment) => setScoreItemAction({ mode: 'delete', assignment })}
      />

      {quickCategory && (
        <QuickScoreDialog
          key={quickCategory}
          open
          category={quickCategory}
          teacherAssignmentId={teacherAssignmentId}
          gradebookPath={gradebookPath}
          onClose={() => setQuickCategory(null)}
        />
      )}
      {scoreItemAction && (
        <ScoreItemActionsDialog
          key={`${scoreItemAction.mode}-${scoreItemAction.assignment.id}`}
          open
          mode={scoreItemAction.mode}
          assignment={scoreItemAction.assignment}
          teacherAssignmentId={teacherAssignmentId}
          onClose={() => setScoreItemAction(null)}
        />
      )}
    </>
  );
});

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        px: 2,
        py: 1,
        flex: { xs: 1, sm: 'none' },
        borderRadius: 1.5,
        bgcolor: 'background.paper',
        border: (theme) => `1px solid ${theme.vars.palette.divider}`,
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="h6">{value}</Typography>
    </Box>
  );
}

type ScoreCategorySectionProps = {
  category: AssignmentCategory;
  items: Assignment[];
  loading: boolean;
  gradebookPath: (assignmentId: string) => string;
  createPath: string;
  onQuickCreate: (category: Exclude<AssignmentCategory, 'assignment'>) => void;
  onEdit: (assignment: Assignment) => void;
  onDelete: (assignment: Assignment) => void;
};

function ScoreCategorySection({
  category,
  items,
  loading,
  gradebookPath,
  createPath,
  onQuickCreate,
  onEdit,
  onDelete,
}: ScoreCategorySectionProps) {
  const meta = ASSIGNMENT_CATEGORY_META[category];
  const canCreate = !meta.singleton || items.length === 0;
  const hasDueDate = category === 'assignment';

  return (
    <Card variant="outlined" sx={{ overflow: 'hidden' }}>
      <Box
        sx={{
          p: 2.5,
          gap: 2,
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}>
          <Iconify icon={SCORE_CATEGORY_ICON[category]} width={34} color="primary.main" />
          <Box>
            <Box sx={{ gap: 1, display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6">{meta.sectionTitle}</Typography>
              <Label color="primary">{items.length} รายการ</Label>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {meta.description}
            </Typography>
          </Box>
        </Box>
        {canCreate &&
          (category === 'assignment' ? (
            <Button
              component={RouterLink}
              href={createPath}
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              เพิ่ม{meta.label}
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:pen-bold" />}
              onClick={() => onQuickCreate(category)}
            >
              {meta.singleton ? 'กรอกคะแนน' : 'เพิ่มรายการคะแนน'}
            </Button>
          ))}
      </Box>
      <Divider />
      <TableContainer>
        <Table sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell>ชื่อรายการ</TableCell>
              <TableCell>รายละเอียด</TableCell>
              {hasDueDate && <TableCell>กำหนดส่ง</TableCell>}
              <TableCell align="center">คะแนนเต็ม</TableCell>
              <TableCell align="right">การจัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={hasDueDate ? 5 : 4}>
                  <Skeleton height={36} />
                </TableCell>
              </TableRow>
            )}
            {!loading && !items.length && (
              <TableRow>
                <TableCell
                  colSpan={hasDueDate ? 5 : 4}
                  sx={{ py: 5, textAlign: 'center', color: 'text.secondary' }}
                >
                  ยังไม่มี{meta.sectionTitle}
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Typography variant="subtitle2">{item.title}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 320 }}>
                    {item.description || 'ไม่มีรายละเอียด'}
                  </Typography>
                </TableCell>
                {hasDueDate && (
                  <TableCell>
                    {item.due_at ? fDateTime(item.due_at, 'DD/MM/YYYY HH:mm') : 'ไม่กำหนด'}
                  </TableCell>
                )}
                <TableCell align="center">{item.full_score}</TableCell>
                <TableCell align="right">
                  <Box sx={{ gap: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      component={RouterLink}
                      href={gradebookPath(item.id)}
                      size="small"
                      variant="outlined"
                    >
                      กรอกคะแนน
                    </Button>
                    <IconButton
                      size="small"
                      color="primary"
                      aria-label={`แก้ไข ${item.title}`}
                      onClick={() => onEdit(item)}
                    >
                      <Iconify icon="solar:settings-bold" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      aria-label={`ลบ ${item.title}`}
                      onClick={() => onDelete(item)}
                    >
                      <Iconify icon="solar:trash-bin-trash-bold" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
