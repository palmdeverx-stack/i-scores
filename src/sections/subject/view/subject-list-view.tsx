'use client';

import type { Subject } from '../subject-actions';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';

import { Iconify } from 'src/components/iconify';
import { useTable, rowInPage, TablePaginationCustom } from 'src/components/table';

import { listSemesters, listAcademicYears } from 'src/sections/academic-year/academic-year-actions';

import { listSubjects, deleteSubject } from '../subject-actions';
import { SubjectFormDialog } from '../components/subject-form-dialog';

// ----------------------------------------------------------------------

export function SubjectListView() {
  const table = useTable({ defaultRowsPerPage: 10 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [yearFilter, setYearFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const queryClient = useQueryClient();

  const {
    data: subjects = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['subjects', yearFilter, semesterFilter],
    queryFn: () =>
      listSubjects({
        academicYearId: yearFilter || undefined,
        semesterId: semesterFilter || undefined,
      }),
  });

  const { data: academicYears = [], isLoading: academicYearsLoading } = useQuery({
    queryKey: ['academic-years'],
    queryFn: listAcademicYears,
  });
  const { data: filterSemesters = [], isLoading: filterSemestersLoading } = useQuery({
    queryKey: ['semesters', yearFilter],
    queryFn: () => listSemesters(yearFilter),
    enabled: !!yearFilter,
  });

  const visibleSubjects = rowInPage(subjects, table.page, table.rowsPerPage);

  const deleteMutation = useMutation({
    mutationFn: deleteSubject,
    onSuccess: async () => {
      table.onUpdatePageDeleteRow(visibleSubjects.length);
      await queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setDeletingSubject(null);
    },
  });

  const openCreateDialog = () => {
    setEditingSubject(null);
    setDialogOpen(true);
  };

  const openEditDialog = (subject: Subject) => {
    setEditingSubject(subject);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingSubject(null);
  };

  return (
    <Container maxWidth="lg" sx={{ pb: 5 }}>
      <Box
        sx={{
          mb: 4,
          gap: 2,
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography component="h1" variant="h3">
            รายวิชา
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            จัดการข้อมูล หน่วยกิต คำอธิบาย และรูปภาพรายวิชาที่เปิดสอนในโรงเรียน
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={openCreateDialog}
          startIcon={<Iconify icon="mingcute:add-line" />}
        >
          เพิ่มรายวิชา
        </Button>
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
          ไม่สามารถโหลดรายการรายวิชาได้
        </Alert>
      )}

      <Card variant="outlined">
        <Box
          sx={{
            gap: 2,
            px: 3,
            py: 2.5,
            display: 'flex',
            alignItems: { xs: 'stretch', md: 'center' },
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography component="h2" variant="h6">
              รายการรายวิชา
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
              {isLoading ? 'กำลังโหลด...' : `${subjects.length} รายการ`}
            </Typography>
          </Box>
          <Box sx={{ gap: 1.5, display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField
              select
              size="small"
              label="ปีการศึกษา"
              value={yearFilter}
              disabled={academicYearsLoading}
              onChange={(event) => {
                setYearFilter(event.target.value);
                setSemesterFilter('');
                table.onResetPage();
              }}
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="">ทุกปีการศึกษา</MenuItem>
              {academicYears.map((year) => (
                <MenuItem key={year.id} value={year.id}>
                  {year.year}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="ภาคเรียน"
              value={semesterFilter}
              disabled={!yearFilter || filterSemestersLoading}
              onChange={(event) => {
                setSemesterFilter(event.target.value);
                table.onResetPage();
              }}
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="">ทุกภาคเรียน</MenuItem>
              {filterSemesters.map((semester) => (
                <MenuItem key={semester.id} value={semester.id}>
                  {semester.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: { sm: 220 } }}>รหัสวิชา</TableCell>
                <TableCell>รายละเอียดรายวิชา</TableCell>
                <TableCell sx={{ width: 190 }}>ปี / ภาคเรียน</TableCell>
                <TableCell sx={{ width: 140 }}>หน่วยกิต</TableCell>
                <TableCell align="right">การจัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5}>กำลังโหลด...</TableCell>
                </TableRow>
              )}
              {!isLoading && !subjects.length && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    sx={{ py: 7, textAlign: 'center', color: 'text.secondary' }}
                  >
                    ยังไม่มีรายวิชา กด “เพิ่มรายวิชา” เพื่อเริ่มต้น
                  </TableCell>
                </TableRow>
              )}
              {visibleSubjects.map((subject) => (
                <TableRow key={subject.id} hover>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ color: subject.code ? 'text.primary' : 'text.disabled' }}
                    >
                      {subject.code ?? 'ไม่ระบุ'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}>
                      <Avatar
                        variant="rounded"
                        src={subject.image_url ?? undefined}
                        alt={`รูปวิชา ${subject.name}`}
                        sx={{ width: 56, height: 44, bgcolor: 'background.neutral' }}
                      >
                        <Iconify icon="solar:gallery-wide-bold" width={24} />
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2">{subject.name}</Typography>
                        <Typography
                          variant="caption"
                          noWrap
                          sx={{ maxWidth: 420, display: 'block', color: 'text.secondary' }}
                        >
                          {subject.description || 'ยังไม่มีคำอธิบาย'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {subject.academic_years?.year ?? 'ยังไม่กำหนดปี'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {subject.semesters?.name ?? 'ยังไม่กำหนดภาคเรียน'}
                    </Typography>
                  </TableCell>
                  <TableCell>{Number(subject.credits).toLocaleString('th-TH')} หน่วยกิต</TableCell>
                  <TableCell align="right">
                    <Tooltip title="แก้ไข">
                      <IconButton
                        size="small"
                        onClick={() => openEditDialog(subject)}
                        aria-label={`แก้ไขวิชา ${subject.name}`}
                      >
                        <Iconify icon="solar:pen-bold" width={18} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="ลบ">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          deleteMutation.reset();
                          setDeletingSubject(subject);
                        }}
                        aria-label={`ลบวิชา ${subject.name}`}
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePaginationCustom
          page={table.page}
          count={subjects.length}
          rowsPerPage={table.rowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={table.onChangePage}
          onRowsPerPageChange={table.onChangeRowsPerPage}
          labelRowsPerPage="แสดงต่อหน้า"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count}`}
          getItemAriaLabel={(type) => {
            if (type === 'first') return 'หน้าแรก';
            if (type === 'last') return 'หน้าสุดท้าย';
            if (type === 'next') return 'หน้าถัดไป';
            return 'หน้าก่อนหน้า';
          }}
          sx={{ borderTop: '1px solid', borderColor: 'divider' }}
        />
      </Card>

      <SubjectFormDialog
        open={dialogOpen}
        editingSubject={editingSubject}
        initialAcademicYearId={yearFilter}
        initialSemesterId={semesterFilter}
        onClose={closeDialog}
      />

      <Dialog
        open={!!deletingSubject}
        onClose={() => !deleteMutation.isPending && setDeletingSubject(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>ยืนยันการลบรายวิชา</DialogTitle>
        <DialogContent>
          {deleteMutation.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteMutation.error.message}
            </Alert>
          )}
          <Typography variant="body2">
            ต้องการลบวิชา <strong>{deletingSubject?.name}</strong> ใช่หรือไม่?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            การมอบหมายครู งาน และคะแนนที่เชื่อมโยงกับวิชานี้อาจถูกลบตามไปด้วย
            และไม่สามารถย้อนกลับได้
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() => setDeletingSubject(null)}
            disabled={deleteMutation.isPending}
          >
            ยกเลิก
          </Button>
          <Button
            color="error"
            variant="contained"
            loading={deleteMutation.isPending}
            onClick={() => deletingSubject && deleteMutation.mutate(deletingSubject.id)}
          >
            ลบรายวิชา
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
