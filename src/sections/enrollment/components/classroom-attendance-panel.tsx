'use client';

import type { ClassroomSubjectAttendanceStatus } from '../classroom-attendance-actions';
import type {
  HomeroomAttendancePeriod,
  HomeroomAttendanceStatus,
} from 'src/sections/teacher-students/homeroom-attendance-actions';

import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from 'minimal-shared/hooks';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { Label } from 'src/components/label';
import { RemixIcon } from 'src/components/remix-icon';

import { listSemesters } from 'src/sections/academic-year/academic-year-actions';
import { getHomeroomAttendanceHistory } from 'src/sections/teacher-students/homeroom-attendance-history-actions';

import { getClassroomSubjectAttendance } from '../classroom-attendance-actions';

// ----------------------------------------------------------------------

const STATUS_CONFIG: Record<
  HomeroomAttendanceStatus,
  { label: string; color: 'success' | 'error' | 'info' | 'warning' }
> = {
  present: { label: 'มา', color: 'success' },
  absent: { label: 'ขาด', color: 'error' },
  leave: { label: 'ลา', color: 'info' },
  late: { label: 'สาย', color: 'warning' },
};

const PERIOD_LABEL: Record<HomeroomAttendancePeriod, string> = {
  morning: 'เข้าเรียน',
  evening: 'เลิกเรียน',
};

type Props = {
  classroomId: string;
  academicYearId: string;
  mode: 'homeroom' | 'subjects';
  search: string;
};

export function ClassroomAttendancePanel({ classroomId, academicYearId, mode, search }: Props) {
  const [semesterId, setSemesterId] = useState('');
  const [period, setPeriod] = useState<HomeroomAttendancePeriod | ''>('');
  const [status, setStatus] = useState<HomeroomAttendanceStatus | ''>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [subjectId, setSubjectId] = useState('');
  const [subjectStatus, setSubjectStatus] = useState<ClassroomSubjectAttendanceStatus | ''>('');
  const [subjectPage, setSubjectPage] = useState(0);
  const [subjectRowsPerPage, setSubjectRowsPerPage] = useState(25);
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    setPage(0);
    setSubjectPage(0);
  }, [debouncedSearch]);

  const semestersQuery = useQuery({
    queryKey: ['classroom-attendance-semesters', academicYearId],
    queryFn: () => listSemesters(academicYearId),
    enabled: !!academicYearId,
  });

  useEffect(() => {
    setSemesterId('');
    setPage(0);
    setSubjectId('');
    setSubjectPage(0);
  }, [academicYearId]);

  useEffect(() => {
    if (semesterId || !semestersQuery.data?.length) return;
    const activeSemester = semestersQuery.data.find((semester) => semester.is_active);
    setSemesterId((activeSemester ?? semestersQuery.data[0]).id);
  }, [semesterId, semestersQuery.data]);

  const selectedSemester = useMemo(
    () => semestersQuery.data?.find((semester) => semester.id === semesterId) ?? null,
    [semesterId, semestersQuery.data]
  );
  const startDate =
    selectedSemester?.start_date ?? dayjs().subtract(1, 'year').format('YYYY-MM-DD');
  const endDate = selectedSemester?.end_date ?? dayjs().format('YYYY-MM-DD');

  const historyQuery = useQuery({
    queryKey: [
      'admin-classroom-attendance',
      classroomId,
      semesterId,
      period,
      status,
      debouncedSearch,
      page,
      rowsPerPage,
    ],
    queryFn: () =>
      getHomeroomAttendanceHistory({
        classroomId,
        startDate,
        endDate,
        period: period || undefined,
        status: status || undefined,
        search: debouncedSearch || undefined,
        page: page + 1,
        pageSize: rowsPerPage,
      }),
    enabled: !!selectedSemester && mode === 'homeroom',
  });

  const subjectHistoryQuery = useQuery({
    queryKey: [
      'admin-classroom-subject-attendance',
      classroomId,
      semesterId,
      subjectId,
      subjectStatus,
      debouncedSearch,
      subjectPage,
      subjectRowsPerPage,
    ],
    queryFn: () =>
      getClassroomSubjectAttendance(classroomId, {
        semesterId,
        startDate,
        endDate,
        subjectId: subjectId || undefined,
        status: subjectStatus || undefined,
        search: debouncedSearch || undefined,
        page: subjectPage + 1,
        pageSize: subjectRowsPerPage,
      }),
    enabled: !!selectedSemester && mode === 'subjects',
  });

  const resetPage = () => setPage(0);

  return (
    <>
      {mode === 'homeroom' && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <Box
            sx={{
              gap: 2,
              px: 3,
              py: 2.5,
              display: 'flex',
              alignItems: { xs: 'stretch', md: 'center' },
              flexDirection: { xs: 'column', md: 'row' },
              borderBottom: '1px solid',
              borderColor: 'divider',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography component="h2" variant="h6">
                เข้าเรียน–เลิกเรียน
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {historyQuery.isLoading
                  ? 'กำลังโหลด...'
                  : `พบ ${historyQuery.data?.total ?? 0} รายการในภาคเรียนนี้`}
              </Typography>
            </Box>
            <Box
              sx={{
                gap: 1.5,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(150px, 1fr))' },
              }}
            >
              <TextField
                select
                size="small"
                label="ภาคเรียน"
                value={semesterId}
                disabled={semestersQuery.isLoading || !semestersQuery.data?.length}
                onChange={(event) => {
                  setSemesterId(event.target.value);
                  resetPage();
                  setSubjectId('');
                  setSubjectPage(0);
                }}
              >
                {(semestersQuery.data ?? []).map((semester) => (
                  <MenuItem key={semester.id} value={semester.id}>
                    {semester.name}
                    {semester.is_active ? ' (ปัจจุบัน)' : ''}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="ช่วงเวลา"
                value={period}
                onChange={(event) => {
                  setPeriod(event.target.value as HomeroomAttendancePeriod | '');
                  resetPage();
                }}
              >
                <MenuItem value="">ทั้งหมด</MenuItem>
                <MenuItem value="morning">เข้าเรียน</MenuItem>
                <MenuItem value="evening">เลิกเรียน</MenuItem>
              </TextField>
              <TextField
                select
                size="small"
                label="สถานะ"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as HomeroomAttendanceStatus | '');
                  resetPage();
                }}
              >
                <MenuItem value="">ทุกสถานะ</MenuItem>
                {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                  <MenuItem key={value} value={value}>
                    {config.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Box>

          {(semestersQuery.isError || historyQuery.isError) && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => historyQuery.refetch()}>
                  ลองอีกครั้ง
                </Button>
              }
              sx={{ m: 2 }}
            >
              ไม่สามารถโหลดข้อมูลเข้าเรียน–เลิกเรียนได้
            </Alert>
          )}

          <TableContainer>
            <Table sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  <TableCell>วันที่</TableCell>
                  <TableCell>นักเรียน</TableCell>
                  <TableCell>ช่วงเวลา</TableCell>
                  <TableCell>สถานะ</TableCell>
                  <TableCell>หมายเหตุ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={5}>กำลังโหลด...</TableCell>
                  </TableRow>
                )}
                {!historyQuery.isLoading && !historyQuery.data?.records.length && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 7, color: 'text.secondary' }}>
                      <RemixIcon icon="solar:calendar-date-bold" width={36} />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        ยังไม่มีข้อมูลเข้าเรียน–เลิกเรียนในภาคเรียนนี้
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {(historyQuery.data?.records ?? []).map((record) => {
                  const studentName =
                    `${record.student.firstName ?? ''} ${record.student.lastName ?? ''}`.trim() ||
                    record.student.username;
                  const statusConfig = STATUS_CONFIG[record.status];

                  return (
                    <TableRow key={record.id} hover>
                      <TableCell>{dayjs(record.attendanceDate).format('DD/MM/YYYY')}</TableCell>
                      <TableCell>
                        <Box sx={{ gap: 1.25, display: 'flex', alignItems: 'center' }}>
                          <Avatar
                            src={record.student.avatarUrl ?? undefined}
                            sx={{ width: 34, height: 34 }}
                          >
                            {studentName.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2">{studentName}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {record.student.studentCode ?? `@${record.student.username}`}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Label
                          variant="soft"
                          color={record.period === 'morning' ? 'primary' : 'secondary'}
                        >
                          {PERIOD_LABEL[record.period]}
                        </Label>
                      </TableCell>
                      <TableCell>
                        <Label variant="soft" color={statusConfig.color}>
                          {statusConfig.label}
                        </Label>
                      </TableCell>
                      <TableCell>{record.note || '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={historyQuery.data?.total ?? 0}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="แสดงต่อหน้า"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count}`}
            onPageChange={(_event, nextPage) => setPage(nextPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(Number(event.target.value));
              setPage(0);
            }}
            sx={{ borderTop: '1px solid', borderColor: 'divider' }}
          />
        </Card>
      )}

      {mode === 'subjects' && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <Box
            sx={{
              gap: 2,
              px: 3,
              py: 2.5,
              display: 'flex',
              alignItems: { xs: 'stretch', md: 'center' },
              flexDirection: { xs: 'column', md: 'row' },
              borderBottom: '1px solid',
              borderColor: 'divider',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography component="h2" variant="h6">
                การเข้าเรียนรายวิชา
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {subjectHistoryQuery.isLoading
                  ? 'กำลังโหลด...'
                  : `${subjectHistoryQuery.data?.subjects.length ?? 0} วิชา · ${subjectHistoryQuery.data?.total ?? 0} รายการเช็กชื่อ`}
              </Typography>
            </Box>
            <Box
              sx={{
                gap: 1.5,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(180px, 1fr))' },
              }}
            >
              <TextField
                select
                size="small"
                label="รายวิชา"
                value={subjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  setSubjectPage(0);
                }}
              >
                <MenuItem value="">ทุกวิชา</MenuItem>
                {(subjectHistoryQuery.data?.subjects ?? []).map((subject) => (
                  <MenuItem key={subject.id} value={subject.id}>
                    {subject.code ? `${subject.code} · ` : ''}
                    {subject.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="สถานะ"
                value={subjectStatus}
                onChange={(event) => {
                  setSubjectStatus(event.target.value as ClassroomSubjectAttendanceStatus | '');
                  setSubjectPage(0);
                }}
              >
                <MenuItem value="">ทุกสถานะ</MenuItem>
                {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                  <MenuItem key={value} value={value}>
                    {config.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Box>

          {subjectHistoryQuery.isError && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => subjectHistoryQuery.refetch()}>
                  ลองอีกครั้ง
                </Button>
              }
              sx={{ m: 2 }}
            >
              {subjectHistoryQuery.error.message}
            </Alert>
          )}

          <TableContainer>
            <Table sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell>วันที่</TableCell>
                  <TableCell>นักเรียน</TableCell>
                  <TableCell>รายวิชา</TableCell>
                  <TableCell>คาบ/วิธีบันทึก</TableCell>
                  <TableCell>สถานะ</TableCell>
                  <TableCell>หมายเหตุ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subjectHistoryQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={6}>กำลังโหลด...</TableCell>
                  </TableRow>
                )}
                {!subjectHistoryQuery.isLoading && !subjectHistoryQuery.data?.records.length && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 7, color: 'text.secondary' }}>
                      ยังไม่มีข้อมูลเช็กชื่อรายวิชาในภาคเรียนนี้
                    </TableCell>
                  </TableRow>
                )}
                {(subjectHistoryQuery.data?.records ?? []).map((record) => {
                  const studentName =
                    `${record.student.firstName ?? ''} ${record.student.lastName ?? ''}`.trim() ||
                    record.student.username;
                  const statusConfig = STATUS_CONFIG[record.status];

                  return (
                    <TableRow key={record.id} hover>
                      <TableCell>{dayjs(record.attendanceDate).format('DD/MM/YYYY')}</TableCell>
                      <TableCell>
                        <Box sx={{ gap: 1.25, display: 'flex', alignItems: 'center' }}>
                          <Avatar
                            src={record.student.avatarUrl ?? undefined}
                            sx={{ width: 34, height: 34 }}
                          >
                            {studentName.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2">{studentName}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {record.student.studentCode ?? `@${record.student.username}`}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2">{record.subject.name}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {record.subject.code || 'ไม่มีรหัสวิชา'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {record.periodKey === 'daily'
                          ? 'เช็กชื่อรายวัน'
                          : record.note?.replace(/^QR · /, '') || 'สแกน QR รายคาบ'}
                      </TableCell>
                      <TableCell>
                        <Label variant="soft" color={statusConfig.color}>
                          {statusConfig.label}
                        </Label>
                      </TableCell>
                      <TableCell>{record.note || '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={subjectHistoryQuery.data?.total ?? 0}
            page={subjectPage}
            rowsPerPage={subjectRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="แสดงต่อหน้า"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count}`}
            onPageChange={(_event, nextPage) => setSubjectPage(nextPage)}
            onRowsPerPageChange={(event) => {
              setSubjectRowsPerPage(Number(event.target.value));
              setSubjectPage(0);
            }}
            sx={{ borderTop: '1px solid', borderColor: 'divider' }}
          />
        </Card>
      )}
    </>
  );
}
