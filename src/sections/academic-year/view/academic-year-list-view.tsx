'use client';

import type { AcademicYear } from '../academic-year-actions';

import * as z from 'zod';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
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

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import {
  listAcademicYears,
  createAcademicYear,
  deleteAcademicYear,
  updateAcademicYear,
} from '../academic-year-actions';

// ----------------------------------------------------------------------

const CreateSchema = z
  .object({
    year: z
      .string()
      .trim()
      .min(1, { error: 'กรุณากรอกปีการศึกษา!' })
      .regex(/^\d{4}$/, { error: 'กรุณากรอกปีการศึกษาเป็นตัวเลข 4 หลัก!' }),
    startDate: z.string().min(1, { error: 'กรุณาเลือกวันที่เริ่มต้น!' }),
    endDate: z.string().min(1, { error: 'กรุณาเลือกวันที่สิ้นสุด!' }),
    isActive: z.boolean(),
  })
  .refine(
    (data) =>
      !data.startDate ||
      !data.endDate ||
      dayjs(data.endDate).isAfter(data.startDate) ||
      dayjs(data.endDate).isSame(data.startDate, 'day'),
    {
      path: ['endDate'],
      error: 'วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น!',
    }
  );

export function AcademicYearListView() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [deletingYear, setDeletingYear] = useState<AcademicYear | null>(null);
  const queryClient = useQueryClient();

  const {
    data: academicYears = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['academic-years'],
    queryFn: listAcademicYears,
  });

  const methods = useForm({
    resolver: zodResolver(CreateSchema),
    defaultValues: { year: '', startDate: '', endDate: '', isActive: true },
  });
  const { handleSubmit, reset } = methods;

  const saveMutation = useMutation({
    mutationFn: (data: z.infer<typeof CreateSchema>) =>
      editingYear
        ? updateAcademicYear(editingYear.id, {
            year: data.year,
            startDate: dayjs(data.startDate).format('YYYY-MM-DD'),
            endDate: dayjs(data.endDate).format('YYYY-MM-DD'),
            isActive: data.isActive,
          })
        : createAcademicYear({
            year: data.year,
            startDate: dayjs(data.startDate).format('YYYY-MM-DD'),
            endDate: dayjs(data.endDate).format('YYYY-MM-DD'),
          }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      setDialogOpen(false);
      setEditingYear(null);
      reset({ year: '', startDate: '', endDate: '', isActive: true });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAcademicYear,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      setDeletingYear(null);
    },
  });

  const openCreateDialog = () => {
    setEditingYear(null);
    reset({ year: '', startDate: '', endDate: '', isActive: true });
    saveMutation.reset();
    setDialogOpen(true);
  };

  const openEditDialog = (year: AcademicYear) => {
    setEditingYear(year);
    reset({
      year: year.year,
      startDate: year.start_date ?? '',
      endDate: year.end_date ?? '',
      isActive: year.is_active,
    });
    saveMutation.reset();
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saveMutation.isPending) return;
    setDialogOpen(false);
    setEditingYear(null);
    reset({ year: '', startDate: '', endDate: '', isActive: true });
    saveMutation.reset();
  };

  const onSubmit = handleSubmit((data) => saveMutation.mutate({ ...data, year: data.year.trim() }));

  return (
    <Container maxWidth={false} sx={{ pb: 5 }}>
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
            ปีการศึกษา
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            จัดการปีการศึกษาและภาคเรียนของโรงเรียน
          </Typography>
        </Box>

        <Button
          variant="contained"
          onClick={openCreateDialog}
          startIcon={<Iconify icon="mingcute:add-line" />}
        >
          เพิ่มปีการศึกษา
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
          ไม่สามารถโหลดรายการปีการศึกษาได้
        </Alert>
      )}

      <Box
        sx={{
          mb: 3,
          gap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
        }}
      >
        <SummaryCard
          icon="solar:calendar-date-bold"
          label="ปีการศึกษาทั้งหมด"
          value={academicYears.length}
          color="primary.main"
        />
        <SummaryCard
          icon="solar:check-circle-bold"
          label="กำลังใช้งาน"
          value={academicYears.filter((year) => year.is_active).length}
          color="success.main"
        />
        <SummaryCard
          icon="solar:clock-circle-bold"
          label="กำหนดช่วงเวลาแล้ว"
          value={academicYears.filter((year) => year.start_date && year.end_date).length}
          color="info.main"
        />
      </Box>

      <Card variant="outlined">
        <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography component="h2" variant="h6">
            รายการปีการศึกษา
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
            {isLoading ? 'กำลังโหลด...' : `${academicYears.length} รายการ`}
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ปีการศึกษา</TableCell>
                <TableCell>ช่วงเวลา</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell align="right">การจัดการ</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4}>กำลังโหลด...</TableCell>
                </TableRow>
              )}

              {!isLoading && !academicYears.length && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    sx={{ py: 7, textAlign: 'center', color: 'text.secondary' }}
                  >
                    ยังไม่มีปีการศึกษา กด “เพิ่มปีการศึกษา” เพื่อเริ่มต้น
                  </TableCell>
                </TableRow>
              )}

              {academicYears.map((year) => (
                <TableRow key={year.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{year.year}</Typography>
                  </TableCell>
                  <TableCell>
                    {year.start_date && year.end_date ? (
                      <Box sx={{ gap: 0.5, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body2">{formatThaiDate(year.start_date)}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          ถึง {formatThaiDate(year.end_date)}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                        ยังไม่กำหนด
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="soft"
                      color={year.is_active ? 'success' : 'default'}
                      label={year.is_active ? 'กำลังใช้งาน' : 'ไม่ได้ใช้งาน'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        component={RouterLink}
                        href={`${paths.admin.academicYear.root}/${year.id}/semester`}
                        size="small"
                      >
                        ภาคเรียน
                      </Button>
                      <Tooltip title="แก้ไข">
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(year)}
                          aria-label={`แก้ไขปีการศึกษา ${year.year}`}
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
                            setDeletingYear(year);
                          }}
                          aria-label={`ลบปีการศึกษา ${year.year}`}
                        >
                          <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="xs">
        <Form methods={methods} onSubmit={onSubmit}>
          <DialogTitle sx={{ pb: 1 }}>
            <Box
              sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}
            >
              <Box>
                <Typography component="h2" variant="h6">
                  {editingYear ? 'แก้ไขปีการศึกษา' : 'เพิ่มปีการศึกษา'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                  {editingYear
                    ? 'ปรับปีและสถานะการใช้งาน'
                    : 'สร้างปีการศึกษาใหม่สำหรับจัดกลุ่มภาคเรียน'}
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
            <Field.Text
              name="year"
              label="ปีการศึกษา *"
              placeholder="เช่น 2569"
              helperText="กรอกเป็นตัวเลข พ.ศ. 4 หลัก"
              autoFocus
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 4 } }}
            />
            <Box
              sx={{
                gap: 2,
                mt: 2.5,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              <Field.DatePicker
                name="startDate"
                label="วันที่เริ่มต้น *"
                format="DD/MM/YYYY"
                slotProps={{ textField: { fullWidth: true, helperText: 'วันเปิดปีการศึกษา' } }}
              />
              <Field.DatePicker
                name="endDate"
                label="วันที่สิ้นสุด *"
                format="DD/MM/YYYY"
                slotProps={{ textField: { fullWidth: true, helperText: 'วันปิดปีการศึกษา' } }}
              />
            </Box>
            {editingYear && (
              <Field.Switch
                name="isActive"
                label="เปิดใช้งานปีการศึกษานี้"
                helperText="ปีที่ปิดใช้งานจะยังคงอยู่ในระบบ แต่แสดงสถานะไม่ได้ใช้งาน"
                sx={{ mt: 2 }}
              />
            )}
          </DialogContent>

          <DialogActions>
            <Button color="inherit" onClick={closeDialog} disabled={saveMutation.isPending}>
              ยกเลิก
            </Button>
            <Button type="submit" variant="contained" loading={saveMutation.isPending}>
              {editingYear ? 'บันทึกการแก้ไข' : 'เพิ่มปีการศึกษา'}
            </Button>
          </DialogActions>
        </Form>
      </Dialog>

      <Dialog
        open={!!deletingYear}
        onClose={() => !deleteMutation.isPending && setDeletingYear(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>ยืนยันการลบปีการศึกษา</DialogTitle>
        <DialogContent>
          {deleteMutation.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteMutation.error.message}
            </Alert>
          )}
          <Typography variant="body2">
            ต้องการลบปีการศึกษา <strong>{deletingYear?.year}</strong> ใช่หรือไม่?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            ภาคเรียน ห้องเรียน รายชื่อนักเรียน งาน และคะแนนที่เชื่อมโยงอาจถูกลบตามไปด้วย
            การดำเนินการนี้ย้อนกลับไม่ได้
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() => setDeletingYear(null)}
            disabled={deleteMutation.isPending}
          >
            ยกเลิก
          </Button>
          <Button
            color="error"
            variant="contained"
            loading={deleteMutation.isPending}
            onClick={() => deletingYear && deleteMutation.mutate(deletingYear.id)}
          >
            ลบปีการศึกษา
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

// ----------------------------------------------------------------------

type SummaryCardProps = {
  icon: 'solar:calendar-date-bold' | 'solar:check-circle-bold' | 'solar:clock-circle-bold';
  label: string;
  value: number;
  color: string;
};

function SummaryCard({ icon, label, value, color }: SummaryCardProps) {
  return (
    <Card variant="outlined" sx={{ p: 2.5 }}>
      <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            flexShrink: 0,
            display: 'grid',
            borderRadius: 1.5,
            color,
            placeItems: 'center',
            bgcolor: 'background.neutral',
          }}
        >
          <Iconify icon={icon} width={25} />
        </Box>
        <Box>
          <Typography variant="h4">{value}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {label}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
}

function formatThaiDate(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}
