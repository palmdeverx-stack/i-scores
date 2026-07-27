'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { RemixIcon } from 'src/components/remix-icon';
import { useTable, rowInPage, TablePaginationCustom } from 'src/components/table';

import { listGradeReviews } from '../grade-review-actions';

// ----------------------------------------------------------------------

function fullName(person: { first_name: string | null; last_name: string | null } | null) {
  return `${person?.first_name ?? ''} ${person?.last_name ?? ''}`.trim() || '-';
}

export function GradeResultsView({
  detailBasePath = paths.admin.gradeResults,
}: {
  detailBasePath?: string;
}) {
  const table = useTable({ defaultRowsPerPage: 10 });
  const [academicYear, setAcademicYear] = useState('all');
  const [semester, setSemester] = useState('all');
  const [gradeLevel, setGradeLevel] = useState('all');
  const [search, setSearch] = useState('');
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['grade-reviews'],
    queryFn: listGradeReviews,
  });

  const approved = useMemo(
    () => data.filter((item) => ['approved', 'locked'].includes(item.review?.status ?? 'draft')),
    [data]
  );
  const years = useMemo(
    () =>
      [
        ...new Set(
          approved.flatMap((item) =>
            item.classroom?.academic_year?.year ? [item.classroom.academic_year.year] : []
          )
        ),
      ]
        .sort((a, b) => String(b).localeCompare(String(a), 'th', { numeric: true })),
    [approved]
  );
  const semesters = useMemo(
    () =>
      [...new Set(approved.flatMap((item) => (item.semester?.name ? [item.semester.name] : [])))]
        .sort((a, b) => String(a).localeCompare(String(b), 'th', { numeric: true })),
    [approved]
  );
  const grades = useMemo(
    () =>
      [
        ...new Set(
          approved.flatMap((item) =>
            item.classroom?.grade_level ? [item.classroom.grade_level] : []
          )
        ),
      ].sort((a, b) => String(a).localeCompare(String(b), 'th', { numeric: true })),
    [approved]
  );
  const filtered = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('th');
    return approved.filter((item) => {
      if (academicYear !== 'all' && item.classroom?.academic_year?.year !== academicYear) {
        return false;
      }
      if (semester !== 'all' && item.semester?.name !== semester) return false;
      if (gradeLevel !== 'all' && item.classroom?.grade_level !== gradeLevel) return false;
      if (!keyword) return true;
      return [
        item.subject?.code,
        item.subject?.name,
        item.classroom?.name,
        fullName(item.teacher),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('th')
        .includes(keyword);
    });
  }, [academicYear, approved, gradeLevel, search, semester]);
  const visible = useMemo(
    () => rowInPage(filtered, table.page, table.rowsPerPage),
    [filtered, table.page, table.rowsPerPage]
  );

  const resetPage = () => table.onResetPage();

  return (
    <Container maxWidth={false} sx={{ pb: 5 }}>
      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h3">
          ผลการเรียน
        </Typography>
        <Typography sx={{ mt: 1, color: 'text.secondary' }}>
          แสดงเฉพาะผลการเรียนที่ผ่านการตรวจสอบและอนุมัติแล้ว พร้อมค้นหาข้อมูลย้อนหลัง
        </Typography>
      </Box>

      {isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              ลองอีกครั้ง
            </Button>
          }
          sx={{ mb: 3 }}
        >
          ไม่สามารถโหลดประวัติผลการเรียนได้
        </Alert>
      )}

      <Card variant="outlined">
        <Box
          sx={{
            p: 2.5,
            gap: 1.5,
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: '180px 180px 180px minmax(260px, 1fr)',
            },
          }}
        >
          <TextField
            select
            size="small"
            label="ปีการศึกษา"
            value={academicYear}
            onChange={(event) => {
              setAcademicYear(event.target.value);
              resetPage();
            }}
          >
            <MenuItem value="all">ทุกปีการศึกษา</MenuItem>
            {years.map((year) => <MenuItem key={year} value={year}>{year}</MenuItem>)}
          </TextField>
          <TextField
            select
            size="small"
            label="ภาคเรียน"
            value={semester}
            onChange={(event) => {
              setSemester(event.target.value);
              resetPage();
            }}
          >
            <MenuItem value="all">ทุกภาคเรียน</MenuItem>
            {semesters.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <TextField
            select
            size="small"
            label="ชั้นปี"
            value={gradeLevel}
            onChange={(event) => {
              setGradeLevel(event.target.value);
              resetPage();
            }}
          >
            <MenuItem value="all">ทุกชั้นปี</MenuItem>
            {grades.map((grade) => <MenuItem key={grade} value={grade}>{grade}</MenuItem>)}
          </TextField>
          <TextField
            size="small"
            value={search}
            placeholder="ค้นหาวิชา ห้องเรียน หรือครู"
            onChange={(event) => {
              setSearch(event.target.value);
              resetPage();
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <RemixIcon icon="eva:search-fill" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        <TableContainer>
          <Table sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                <TableCell>ปี/ภาคเรียน</TableCell>
                <TableCell>ชั้นปี/ห้องเรียน</TableCell>
                <TableCell>รายวิชา</TableCell>
                <TableCell>ครูผู้สอน</TableCell>
                <TableCell>วันที่อนุมัติ</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell align="right">เอกสาร</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
                      <CircularProgress size={28} />
                    </Box>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !filtered.length && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 7, textAlign: 'center', color: 'text.secondary' }}>
                    ไม่พบผลการเรียนที่ผ่านการตรวจสอบ
                  </TableCell>
                </TableRow>
              )}
              {visible.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    {item.classroom?.academic_year?.year ?? '-'} / {item.semester?.name ?? '-'}
                  </TableCell>
                  <TableCell>
                    {item.classroom?.grade_level ?? '-'} {item.classroom?.name ?? ''}
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2">{item.subject?.name ?? '-'}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {item.subject?.code || 'ไม่มีรหัสวิชา'}
                    </Typography>
                  </TableCell>
                  <TableCell>{fullName(item.teacher)}</TableCell>
                  <TableCell>
                    {item.review?.approved_at
                      ? fDateTime(item.review.approved_at, 'DD/MM/YYYY HH:mm')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="soft"
                      color="success"
                      label={item.review?.status === 'locked' ? 'ปิดผลแล้ว' : 'อนุมัติแล้ว'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      component={RouterLink}
                      href={`${detailBasePath}/${item.id}`}
                      size="small"
                      variant="outlined"
                      startIcon={<RemixIcon icon="solar:document-text-bold" />}
                    >
                      ดูใบ ปพ.5
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePaginationCustom
          page={table.page}
          count={filtered.length}
          rowsPerPage={table.rowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={table.onChangePage}
          onRowsPerPageChange={table.onChangeRowsPerPage}
          labelRowsPerPage="แสดงต่อหน้า"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count}`}
        />
      </Card>
    </Container>
  );
}
