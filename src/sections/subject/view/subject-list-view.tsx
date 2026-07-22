'use client';

import type { Subject } from '../subject-actions';

import * as z from 'zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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

import { Upload } from 'src/components/upload';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { listSemesters, listAcademicYears } from 'src/sections/academic-year/academic-year-actions';

import {
  listSubjects,
  createSubject,
  deleteSubject,
  updateSubject,
  uploadSubjectImage,
  removeSubjectImage,
} from '../subject-actions';

// ----------------------------------------------------------------------

const CreateSchema = z.object({
  code: z.string().trim(),
  name: z.string().trim().min(1, { error: 'กรุณากรอกชื่อวิชา!' }),
  credits: z.number().min(0, { error: 'หน่วยกิตต้องไม่ต่ำกว่า 0!' }).max(99),
  description: z.string().trim().max(2000, { error: 'คำอธิบายต้องไม่เกิน 2,000 ตัวอักษร!' }),
  academicYearId: z.string().min(1, { error: 'กรุณาเลือกปีการศึกษา!' }),
  semesterId: z.string().min(1, { error: 'กรุณาเลือกภาคเรียน!' }),
});

const IMAGE_ACCEPT = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
};
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function SubjectListView() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [subjectImage, setSubjectImage] = useState<File | string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
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

  const methods = useForm({
    resolver: zodResolver(CreateSchema),
    defaultValues: {
      code: '',
      name: '',
      credits: 1,
      description: '',
      academicYearId: '',
      semesterId: '',
    },
  });
  const { handleSubmit, reset, setValue, control } = methods;
  const formAcademicYearId = useWatch({ control, name: 'academicYearId' });
  const { data: formSemesters = [], isLoading: formSemestersLoading } = useQuery({
    queryKey: ['semesters', formAcademicYearId],
    queryFn: () => listSemesters(formAcademicYearId),
    enabled: !!formAcademicYearId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: z.infer<typeof CreateSchema>) => {
      const params = {
        name: data.name.trim(),
        code: data.code.trim() || undefined,
        credits: data.credits,
        description: data.description.trim() || undefined,
        academicYearId: data.academicYearId,
        semesterId: data.semesterId,
      };
      const subject = editingSubject
        ? await updateSubject(editingSubject.id, params)
        : await createSubject(params);

      try {
        if (subjectImage instanceof File) {
          return await uploadSubjectImage(subject.id, subjectImage);
        }
        if (editingSubject && imageRemoved && editingSubject.image_url) {
          return await removeSubjectImage(subject.id);
        }
        return subject;
      } catch (error) {
        if (!editingSubject) await deleteSubject(subject.id);
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setDialogOpen(false);
      setEditingSubject(null);
      setSubjectImage(null);
      setImageRemoved(false);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setDeletingSubject(null);
    },
  });

  const openCreateDialog = () => {
    setEditingSubject(null);
    setSubjectImage(null);
    setImageRemoved(false);
    reset({
      code: '',
      name: '',
      credits: 1,
      description: '',
      academicYearId: yearFilter,
      semesterId: semesterFilter,
    });
    saveMutation.reset();
    setDialogOpen(true);
  };

  const openEditDialog = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectImage(subject.image_url);
    setImageRemoved(false);
    reset({
      code: subject.code ?? '',
      name: subject.name,
      credits: Number(subject.credits),
      description: subject.description ?? '',
      academicYearId: subject.academic_year_id ?? '',
      semesterId: subject.semester_id ?? '',
    });
    saveMutation.reset();
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saveMutation.isPending) return;
    setDialogOpen(false);
    setEditingSubject(null);
    setSubjectImage(null);
    setImageRemoved(false);
    reset();
    saveMutation.reset();
  };

  const onSubmit = handleSubmit((data) => saveMutation.mutate(data));

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
              onChange={(event) => setSemesterFilter(event.target.value)}
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
              {subjects.map((subject) => (
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
      </Card>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <Form methods={methods} onSubmit={onSubmit}>
          <DialogTitle sx={{ pb: 1 }}>
            <Box
              sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}
            >
              <Box>
                <Typography component="h2" variant="h6">
                  {editingSubject ? 'แก้ไขรายวิชา' : 'เพิ่มรายวิชา'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                  {editingSubject
                    ? 'ปรับข้อมูล หน่วยกิต คำอธิบาย และรูปภาพ'
                    : 'เพิ่มรายละเอียดวิชาใหม่เข้าสู่รายการของโรงเรียน'}
                </Typography>
              </Box>
              <IconButton
                onClick={closeDialog}
                disabled={saveMutation.isPending}
                aria-label="ปิดหน้าต่าง"
              >
                <Iconify icon="mingcute:close-line" />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent sx={{ pt: 2 }}>
            {saveMutation.error && (
              <Alert severity="error" sx={{ mb: 2.5 }}>
                {saveMutation.error.message}
              </Alert>
            )}
            <Box sx={{ gap: 2.5, display: 'flex', flexDirection: 'column' }}>
              <Box
                sx={{
                  gap: 2,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                }}
              >
                <Field.Select
                  name="academicYearId"
                  label="ปีการศึกษา *"
                  disabled={academicYearsLoading}
                  onChange={(event) => {
                    setValue('academicYearId', event.target.value);
                    setValue('semesterId', '', { shouldValidate: true });
                  }}
                  helperText="ปีที่เปิดรายวิชานี้"
                >
                  {academicYears.map((year) => (
                    <MenuItem key={year.id} value={year.id}>
                      {year.year}
                    </MenuItem>
                  ))}
                </Field.Select>
                <Field.Select
                  name="semesterId"
                  label="ภาคเรียน *"
                  disabled={!formAcademicYearId || formSemestersLoading}
                  helperText={formAcademicYearId ? 'ภาคเรียนที่เปิดรายวิชา' : 'เลือกปีการศึกษาก่อน'}
                >
                  {formSemesters.map((semester) => (
                    <MenuItem key={semester.id} value={semester.id}>
                      {semester.name}
                    </MenuItem>
                  ))}
                </Field.Select>
              </Box>
              <Field.Text
                name="code"
                label="รหัสวิชา"
                placeholder="เช่น MATH101"
                helperText="ไม่บังคับ ใช้ช่วยค้นหาและแยกรายวิชา"
                autoFocus
              />
              <Field.Text
                name="name"
                label="ชื่อวิชา *"
                placeholder="เช่น คณิตศาสตร์พื้นฐาน"
                helperText="ชื่อที่ครูและนักเรียนจะเห็นในระบบ"
              />
              <Field.Text
                name="credits"
                label="หน่วยกิต *"
                type="number"
                helperText="รองรับเลขทศนิยม เช่น 0.5, 1 หรือ 3"
                slotProps={{ htmlInput: { min: 0, max: 99, step: 0.5 } }}
              />
              <Field.Text
                name="description"
                label="คำอธิบายรายวิชา"
                placeholder="สรุปเนื้อหาและวัตถุประสงค์ของรายวิชา"
                helperText="ไม่บังคับ สูงสุด 2,000 ตัวอักษร"
                multiline
                minRows={3}
              />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  รูปภาพรายวิชา
                </Typography>
                <Upload
                  value={subjectImage}
                  accept={IMAGE_ACCEPT}
                  maxSize={MAX_IMAGE_SIZE}
                  disabled={saveMutation.isPending}
                  onDrop={(files) => {
                    const file = files[0];
                    if (file) {
                      setSubjectImage(file);
                      setImageRemoved(false);
                    }
                  }}
                  onDelete={() => {
                    setSubjectImage(null);
                    setImageRemoved(true);
                  }}
                  helperText="PNG, JPEG หรือ WEBP ขนาดไม่เกิน 5MB แนะนำอัตราส่วน 16:9"
                  sx={{ height: 220 }}
                />
              </Box>
            </Box>
          </DialogContent>

          <DialogActions>
            <Button color="inherit" onClick={closeDialog} disabled={saveMutation.isPending}>
              ยกเลิก
            </Button>
            <Button type="submit" variant="contained" loading={saveMutation.isPending}>
              {editingSubject ? 'บันทึกการแก้ไข' : 'เพิ่มรายวิชา'}
            </Button>
          </DialogActions>
        </Form>
      </Dialog>

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
