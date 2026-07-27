'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { RemixIcon } from 'src/components/remix-icon';

import { getScoreReport } from 'src/sections/teacher-assignment/score-report-actions';

import { buildGradeResultRows } from '../grade-result-utils';
import { getGradeReviewSubmission } from '../grade-review-actions';

// ----------------------------------------------------------------------

const GradeResultPdfDialog = dynamic(
  () => import('../components/grade-result-pdf-dialog'),
  { ssr: false }
);

export function GradeResultDetailView({
  teacherAssignmentId,
  backPath = paths.admin.gradeResults,
}: {
  teacherAssignmentId: string;
  backPath?: string;
}) {
  const [pdfOpen, setPdfOpen] = useState(false);
  const reportQuery = useQuery({
    queryKey: ['score-report', teacherAssignmentId],
    queryFn: () => getScoreReport(teacherAssignmentId),
  });
  const submissionQuery = useQuery({
    queryKey: ['grade-review', teacherAssignmentId],
    queryFn: () => getGradeReviewSubmission(teacherAssignmentId),
  });
  const rows = useMemo(
    () => (reportQuery.data ? buildGradeResultRows(reportQuery.data) : []),
    [reportQuery.data]
  );
  const average = rows.length
    ? rows.reduce((total, row) => total + row.normalized, 0) / rows.length
    : 0;
  const passed = rows.filter((row) => row.normalized >= 50).length;
  const report = reportQuery.data;
  const submission = submissionQuery.data;

  if (reportQuery.isLoading || submissionQuery.isLoading) {
    return (
      <Box sx={{ py: 12, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (
    !report ||
    !submission ||
    !['approved', 'locked'].includes(submission.status) ||
    reportQuery.isError ||
    submissionQuery.isError
  ) {
    return (
      <Container maxWidth="md">
        <Alert
          severity="warning"
          action={
            <Button component={RouterLink} href={backPath} color="inherit">
              กลับหน้าผลการเรียน
            </Button>
          }
        >
          ผลการเรียนนี้ยังไม่ผ่านการตรวจสอบและอนุมัติ
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth={false} sx={{ pb: 6 }}>
      <Button
        component={RouterLink}
        href={backPath}
        color="inherit"
        startIcon={<RemixIcon icon="eva:arrow-ios-back-fill" />}
        sx={{ mb: 2 }}
      >
        กลับหน้าผลการเรียน
      </Button>

      <Box
        sx={{
          mb: 3,
          gap: 2,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography component="h1" variant="h3">
            ผลการเรียน · {report.subject.name}
          </Typography>
          <Typography sx={{ mt: 0.75, color: 'text.secondary' }}>
            {report.subject.code || 'ไม่มีรหัสวิชา'} · ห้อง {report.classroom.name} · ภาคเรียนที่{' '}
            {report.semesterName} ปีการศึกษา {report.classroom.academicYear}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<RemixIcon icon="solar:document-bold" />}
          onClick={() => setPdfOpen(true)}
        >
          พรีวิว / ดาวน์โหลดใบ ปพ.5
        </Button>
      </Box>

      <Box
        sx={{
          mb: 3,
          gap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        }}
      >
        {[
          { label: 'นักเรียนทั้งหมด', value: `${rows.length} คน` },
          { label: 'คะแนนเฉลี่ย', value: average.toFixed(2) },
          { label: 'ผ่านเกณฑ์', value: `${passed} คน` },
          { label: 'ไม่ผ่านเกณฑ์', value: `${rows.length - passed} คน` },
        ].map((item) => (
          <Card key={item.label} variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{item.label}</Typography>
            <Typography variant="h4" sx={{ mt: 0.5 }}>{item.value}</Typography>
          </Card>
        ))}
      </Box>

      <Card variant="outlined" sx={{ overflow: 'hidden' }}>
        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6">รายละเอียดแบบ ปพ.5</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              คะแนนรวมถูกปรับเป็นฐาน 100 และคำนวณระดับผลการเรียน
            </Typography>
          </Box>
          <Chip
            variant="soft"
            color="success"
            label={submission.status === 'locked' ? 'ปิดผลการเรียนแล้ว' : 'อนุมัติแล้ว'}
          />
        </Box>
        <TableContainer>
          <Table sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                <TableCell>เลขที่</TableCell>
                <TableCell>รหัสนักเรียน</TableCell>
                <TableCell>ชื่อ-นามสกุล</TableCell>
                <TableCell align="right">งาน</TableCell>
                <TableCell align="right">แบบทดสอบ</TableCell>
                <TableCell align="right">กลางภาค</TableCell>
                <TableCell align="right">ปลายภาค</TableCell>
                <TableCell align="right">อื่น ๆ</TableCell>
                <TableCell align="right">รวม/100</TableCell>
                <TableCell align="center">ผลการเรียน</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.student.id} hover>
                  <TableCell>{row.student.studentNumber ?? index + 1}</TableCell>
                  <TableCell>{row.student.studentCode ?? '-'}</TableCell>
                  <TableCell>
                    {`${row.student.firstName ?? ''} ${row.student.lastName ?? ''}`.trim() ||
                      row.student.username}
                  </TableCell>
                  <TableCell align="right">{row.categoryScores.assignment.toFixed(2)}</TableCell>
                  <TableCell align="right">{row.categoryScores.quiz.toFixed(2)}</TableCell>
                  <TableCell align="right">{row.categoryScores.midterm.toFixed(2)}</TableCell>
                  <TableCell align="right">{row.categoryScores.final.toFixed(2)}</TableCell>
                  <TableCell align="right">{row.categoryScores.other.toFixed(2)}</TableCell>
                  <TableCell align="right">{row.normalized.toFixed(2)}</TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      variant="soft"
                      color={
                        row.student.specialResult
                          ? 'warning'
                          : row.normalized >= 50
                            ? 'success'
                            : 'error'
                      }
                      label={row.grade}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {pdfOpen && (
        <GradeResultPdfDialog
          open
          onClose={() => setPdfOpen(false)}
          report={report}
          submission={submission}
        />
      )}
    </Container>
  );
}
