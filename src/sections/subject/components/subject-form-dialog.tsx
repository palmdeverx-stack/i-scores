'use client';

import type { Subject } from '../subject-actions';

import * as z from 'zod';
import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { Box, Stack } from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { Upload } from 'src/components/upload';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { listSemesters, listAcademicYears } from 'src/sections/academic-year/academic-year-actions';

import {
  createSubject,
  deleteSubject,
  updateSubject,
  uploadSubjectImage,
  removeSubjectImage,
} from '../subject-actions';

// ----------------------------------------------------------------------

const FormSchema = z.object({
  code: z.string().trim(),
  name: z.string().trim().min(1, { error: 'กรุณากรอกชื่อวิชา!' }),
  credits: z.number().min(0, { error: 'หน่วยกิตต้องไม่ต่ำกว่า 0!' }).max(99),
  description: z.string().trim().max(2000, { error: 'คำอธิบายต้องไม่เกิน 2,000 ตัวอักษร!' }),
  academicYearId: z.string().min(1, { error: 'กรุณาเลือกปีการศึกษา!' }),
  semesterId: z.string().min(1, { error: 'กรุณาเลือกภาคเรียน!' }),
});

type FormValues = z.infer<typeof FormSchema>;

const IMAGE_ACCEPT = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
};
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const EMPTY_VALUES: FormValues = {
  code: '',
  name: '',
  credits: 1,
  description: '',
  academicYearId: '',
  semesterId: '',
};

type Props = {
  open: boolean;
  editingSubject: Subject | null;
  initialAcademicYearId?: string;
  initialSemesterId?: string;
  onClose: () => void;
};

export function SubjectFormDialog({
  open,
  editingSubject,
  initialAcademicYearId = '',
  initialSemesterId = '',
  onClose,
}: Props) {
  const queryClient = useQueryClient();
  const [subjectImage, setSubjectImage] = useState<File | string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);

  const methods = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: EMPTY_VALUES,
  });
  const { handleSubmit, reset, setValue, control } = methods;
  const academicYearId = useWatch({ control, name: 'academicYearId' });

  const { data: academicYears = [], isLoading: academicYearsLoading } = useQuery({
    queryKey: ['academic-years'],
    queryFn: listAcademicYears,
    enabled: open,
  });
  const { data: semesters = [], isLoading: semestersLoading } = useQuery({
    queryKey: ['semesters', academicYearId],
    queryFn: () => listSemesters(academicYearId),
    enabled: open && !!academicYearId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: FormValues) => {
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
      onClose();
    },
  });

  useEffect(() => {
    if (!open) return;

    saveMutation.reset();
    setImageRemoved(false);
    setSubjectImage(editingSubject?.image_url ?? null);
    reset(
      editingSubject
        ? {
            code: editingSubject.code ?? '',
            name: editingSubject.name,
            credits: Number(editingSubject.credits),
            description: editingSubject.description ?? '',
            academicYearId: editingSubject.academic_year_id ?? '',
            semesterId: editingSubject.semester_id ?? '',
          }
        : {
            ...EMPTY_VALUES,
            academicYearId: initialAcademicYearId,
            semesterId: initialSemesterId,
          }
    );
    // Mutation methods are stable; including the mutation object causes unnecessary resets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingSubject, initialAcademicYearId, initialSemesterId, open, reset]);

  const handleClose = () => {
    if (!saveMutation.isPending) onClose();
  };
  const onSubmit = handleSubmit((data) => saveMutation.mutate(data));

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      scroll="paper"
      fullWidth
      maxWidth="md"
      slotProps={{
        paper: {
          sx: {
            maxHeight: { xs: 'calc(100dvh - 24px)', sm: 'calc(100dvh - 64px)' },
            overflow: 'hidden',
            '& > form': {
              minHeight: 0,
              display: 'flex',
              overflow: 'hidden',
              flexDirection: 'column',
            },
          },
        },
      }}
    >
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle
          sx={{
            pb: 2,
            flexShrink: 0,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
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
              onClick={handleClose}
              disabled={saveMutation.isPending}
              aria-label="ปิดหน้าต่าง"
            >
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent
          sx={{ py: 2.5, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}
        >
          <Stack sx={{ mt: 2 }}>
            {saveMutation.error && (
              <Alert severity="error" sx={{ mb: 2.5 }}>
                {saveMutation.error.message}
              </Alert>
            )}

            <Box
              sx={{
                gap: 3,
                display: 'grid',
                alignItems: 'start',
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.25fr) minmax(280px, 0.75fr)' },
              }}
            >
              <Box sx={{ gap: 2.5, display: 'flex', flexDirection: 'column' }}>
                <Box>
                  <Typography variant="subtitle1">ข้อมูลรายวิชา</Typography>
                  <Typography variant="body2" sx={{ mt: 0.25, color: 'text.secondary' }}>
                    ระบุปีการศึกษา ภาคเรียน และข้อมูลพื้นฐานของวิชา
                  </Typography>
                </Box>

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
                    disabled={!academicYearId || semestersLoading}
                    helperText={academicYearId ? 'ภาคเรียนที่เปิดรายวิชา' : 'เลือกปีการศึกษาก่อน'}
                  >
                    {semesters.map((semester) => (
                      <MenuItem key={semester.id} value={semester.id}>
                        {semester.name}
                      </MenuItem>
                    ))}
                  </Field.Select>
                </Box>

                <Box
                  sx={{
                    gap: 2,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'minmax(180px, 0.7fr) 1.3fr' },
                  }}
                >
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
                </Box>

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
              </Box>

              <Box
                sx={{
                  p: { xs: 0, md: 2.5 },
                  borderRadius: 2,
                  bgcolor: { xs: 'transparent', md: 'background.neutral' },
                  border: { xs: 'none', md: '1px solid' },
                  borderColor: 'divider',
                }}
              >
                <Typography variant="subtitle1">รูปภาพรายวิชา</Typography>
                <Typography variant="body2" sx={{ mt: 0.25, mb: 1.5, color: 'text.secondary' }}>
                  รูปนี้จะแสดงในหน้ารายวิชาของครูและนักเรียน
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
                  sx={{ height: { xs: 180, sm: 220 } }}
                />
              </Box>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            flexShrink: 0,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Button color="inherit" onClick={handleClose} disabled={saveMutation.isPending}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="contained" loading={saveMutation.isPending}>
            {editingSubject ? 'บันทึกการแก้ไข' : 'เพิ่มรายวิชา'}
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
