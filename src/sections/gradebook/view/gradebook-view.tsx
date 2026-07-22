'use client';

import type { GradebookRow, SubmissionStatus } from '../gradebook-actions';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { Label } from 'src/components/label';

import { saveScore, getGradebook } from '../gradebook-actions';

// ----------------------------------------------------------------------

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  submitted: 'ส่งแล้ว',
  late: 'ส่งช้า',
  not_submitted: 'ยังไม่ส่ง',
  absent: 'ขาดสอบ',
  sick_leave: 'ลาป่วย',
  pending_review: 'รอตรวจ',
};

const STATUS_COLOR: Record<SubmissionStatus, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  submitted: 'success',
  late: 'warning',
  not_submitted: 'error',
  absent: 'error',
  sick_leave: 'info',
  pending_review: 'default',
};

const STATUS_ORDER: SubmissionStatus[] = [
  'submitted',
  'late',
  'not_submitted',
  'absent',
  'sick_leave',
  'pending_review',
];

// ----------------------------------------------------------------------

type Props = {
  assignmentId: string;
};

export function GradebookView({ assignmentId }: Props) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | SubmissionStatus>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['gradebook', assignmentId],
    queryFn: () => getGradebook(assignmentId),
  });

  const counts = useMemo(() => {
    const base: Record<SubmissionStatus, number> = {
      submitted: 0,
      late: 0,
      not_submitted: 0,
      absent: 0,
      sick_leave: 0,
      pending_review: 0,
    };
    data?.rows.forEach((row) => {
      base[row.score.status] += 1;
    });
    return base;
  }, [data]);

  const filteredRows = data?.rows.filter((row) => filter === 'all' || row.score.status === filter);

  return (
    <Container sx={{ py: 10 }}>
      <Typography variant="h3" sx={{ mb: 1 }}>
        กรอกคะแนน: {data?.assignment.title ?? ''}
      </Typography>
      <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
        คะแนนเต็ม {data?.assignment.full_score ?? '-'}
      </Typography>

      <Tabs
        value={filter}
        onChange={(_event, value) => setFilter(value)}
        sx={{ mb: 3 }}
        variant="scrollable"
      >
        <Tab label={`ทั้งหมด (${data?.rows.length ?? 0})`} value="all" />
        {STATUS_ORDER.map((status) => (
          <Tab key={status} label={`${STATUS_LABEL[status]} (${counts[status]})`} value={status} />
        ))}
      </Tabs>

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>เลขที่</TableCell>
              <TableCell>ชื่อ-นามสกุล</TableCell>
              <TableCell>สถานะ</TableCell>
              <TableCell>คะแนน</TableCell>
              <TableCell>หมายเหตุ</TableCell>
              <TableCell align="right">การจัดการ</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6}>กำลังโหลด...</TableCell>
              </TableRow>
            )}

            {!isLoading && !filteredRows?.length && (
              <TableRow>
                <TableCell colSpan={6}>ไม่มีนักเรียนในสถานะนี้</TableCell>
              </TableRow>
            )}

            {filteredRows?.map((row) => (
              <GradeRow
                key={row.student.id}
                row={row}
                assignmentId={assignmentId}
                fullScore={data!.assignment.full_score}
                onSaved={() => queryClient.invalidateQueries({ queryKey: ['gradebook', assignmentId] })}
              />
            ))}
          </TableBody>
        </Table>
      </Card>
    </Container>
  );
}

// ----------------------------------------------------------------------

type GradeRowProps = {
  row: GradebookRow;
  assignmentId: string;
  fullScore: number;
  onSaved: () => void;
};

function GradeRow({ row, assignmentId, fullScore, onSaved }: GradeRowProps) {
  const [status, setStatus] = useState<SubmissionStatus>(row.score.status);
  const [score, setScore] = useState(row.score.score?.toString() ?? '');
  const [feedback, setFeedback] = useState(row.score.feedback ?? '');

  const saveMutation = useMutation({
    mutationFn: (params: {
      studentId: string;
      score?: number | null;
      feedback?: string;
      status: SubmissionStatus;
    }) => saveScore(assignmentId, params),
    onSuccess: onSaved,
  });

  const handleSave = () => {
    const numericScore = score === '' ? null : Number(score);

    if (numericScore !== null && (Number.isNaN(numericScore) || numericScore < 0 || numericScore > fullScore)) {
      return;
    }

    saveMutation.mutate({
      studentId: row.student.id,
      score: numericScore,
      feedback: feedback || undefined,
      status,
    });
  };

  return (
    <TableRow>
      <TableCell>{row.studentNumber ?? '-'}</TableCell>
      <TableCell>
        {`${row.student.first_name ?? ''} ${row.student.last_name ?? ''}`.trim() ||
          row.student.username}
      </TableCell>
      <TableCell sx={{ width: 160 }}>
        <TextField
          select
          size="small"
          fullWidth
          value={status}
          onChange={(event) => setStatus(event.target.value as SubmissionStatus)}
        >
          {STATUS_ORDER.map((option) => (
            <MenuItem key={option} value={option}>
              <Label color={STATUS_COLOR[option]} variant="soft" sx={{ mr: 1 }}>
                {STATUS_LABEL[option]}
              </Label>
            </MenuItem>
          ))}
        </TextField>
      </TableCell>
      <TableCell sx={{ width: 120 }}>
        <TextField
          size="small"
          type="number"
          slotProps={{ htmlInput: { min: 0, max: fullScore } }}
          value={score}
          onChange={(event) => setScore(event.target.value)}
        />
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          fullWidth
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
        />
      </TableCell>
      <TableCell align="right">
        <Button size="small" variant="contained" loading={saveMutation.isPending} onClick={handleSave}>
          บันทึก
        </Button>
      </TableCell>
    </TableRow>
  );
}
