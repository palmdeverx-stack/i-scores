'use client';

import type { Department } from '../department-management-actions';

import * as z from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
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
import AvatarGroup from '@mui/material/AvatarGroup';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DEPARTMENT_PERMISSIONS } from 'src/lib/department-permissions-config';

import { RemixIcon } from 'src/components/remix-icon';
import { Form, Field } from 'src/components/hook-form';

import {
  listDepartments,
  createDepartment,
  deleteDepartment,
  updateDepartment,
} from '../department-management-actions';

// ----------------------------------------------------------------------

const FormSchema = z.object({
  name: z.string().trim().min(1, { error: 'กรุณากรอกชื่อฝ่าย!' }),
  description: z.string().trim(),
});

export function DepartmentListView() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);
  const queryClient = useQueryClient();

  const {
    data: departments = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({ queryKey: ['departments'], queryFn: listDepartments });

  const methods = useForm({
    resolver: zodResolver(FormSchema),
    defaultValues: { name: '', description: '' },
  });
  const { handleSubmit, reset } = methods;

  const saveMutation = useMutation({
    mutationFn: (data: z.infer<typeof FormSchema>) =>
      editing ? updateDepartment(editing.id, data) : createDepartment(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
      setDialogOpen(false);
      setEditing(null);
      reset({ name: '', description: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
      setDeleting(null);
    },
  });

  const openCreateDialog = () => {
    setEditing(null);
    reset({ name: '', description: '' });
    saveMutation.reset();
    setDialogOpen(true);
  };

  const openEditDialog = (department: Department) => {
    setEditing(department);
    reset({
      name: department.name,
      description: department.description ?? '',
    });
    saveMutation.reset();
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saveMutation.isPending) return;
    setDialogOpen(false);
    setEditing(null);
    reset({ name: '', description: '' });
    saveMutation.reset();
  };

  const onSubmit = handleSubmit((data) => saveMutation.mutate(data));

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
            จัดการฝ่าย
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            กำหนดฝ่ายงานภายในโรงเรียน พร้อมหัวหน้าฝ่ายและสมาชิก
          </Typography>
        </Box>

        <Box sx={{ gap: 1, display: 'flex' }}>
          <Button
            component={RouterLink}
            href={paths.admin.department.permissions}
            variant="outlined"
            startIcon={<RemixIcon icon="solar:shield-keyhole-bold-duotone" />}
          >
            จัดการสิทธิ์เข้าใช้งาน
          </Button>
          <Button
            variant="contained"
            onClick={openCreateDialog}
            startIcon={<RemixIcon icon="mingcute:add-line" />}
          >
            เพิ่มฝ่าย
          </Button>
        </Box>
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
          ไม่สามารถโหลดรายการฝ่ายได้
        </Alert>
      )}

      <Card variant="outlined">
        <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography component="h2" variant="h6">
            รายการฝ่าย
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
            {isLoading ? 'กำลังโหลด...' : `${departments.length} ฝ่าย`}
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ฝ่าย</TableCell>
                <TableCell>หัวหน้าฝ่าย</TableCell>
                <TableCell>สมาชิก</TableCell>
                <TableCell align="right">การจัดการ</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4}>กำลังโหลด...</TableCell>
                </TableRow>
              )}

              {!isLoading && !departments.length && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    sx={{ py: 7, textAlign: 'center', color: 'text.secondary' }}
                  >
                    ยังไม่มีฝ่าย กด “เพิ่มฝ่าย” เพื่อเริ่มต้น
                  </TableCell>
                </TableRow>
              )}

              {departments.map((department) => {
                const heads = department.members.filter(
                  (member) => member.role_in_department === 'head'
                );
                return (
                  <TableRow key={department.id} hover>
                    <TableCell>
                      <Box sx={{ gap: 0.75, display: 'flex', alignItems: 'center' }}>
                        <Typography variant="subtitle2">{department.name}</Typography>
                        {department.permissions.map((permission) => {
                          const item = DEPARTMENT_PERMISSIONS.find(
                            (candidate) => candidate.key === permission
                          );
                          return item ? (
                            <Chip
                              key={permission}
                              size="small"
                              variant="soft"
                              color="info"
                              label={item.label}
                            />
                          ) : null;
                        })}
                      </Box>
                      {department.description && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {department.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {heads.length ? (
                        <Box sx={{ gap: 0.5, display: 'flex', flexWrap: 'wrap' }}>
                          {heads.map((head) => (
                            <Chip
                              key={head.id}
                              size="small"
                              variant="soft"
                              color="primary"
                              label={`${head.teacher.first_name ?? ''} ${head.teacher.last_name ?? ''}`.trim()}
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                          ยังไม่มีหัวหน้าฝ่าย
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {department.members.length ? (
                        <AvatarGroup
                          max={4}
                          sx={{ justifyContent: 'flex-end', '& .MuiAvatar-root': { width: 28, height: 28 } }}
                        >
                          {department.members.map((member) => (
                            <Avatar
                              key={member.id}
                              src={member.teacher.avatar_url ?? undefined}
                              alt={`${member.teacher.first_name ?? ''} ${member.teacher.last_name ?? ''}`.trim()}
                            >
                              {member.teacher.first_name?.charAt(0) ?? '?'}
                            </Avatar>
                          ))}
                        </AvatarGroup>
                      ) : (
                        <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                          {department.members.length} คน
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          component={RouterLink}
                          href={paths.admin.department.detail(department.id)}
                          size="small"
                        >
                          จัดการสมาชิก
                        </Button>
                        <Tooltip title="แก้ไข">
                          <IconButton
                            size="small"
                            onClick={() => openEditDialog(department)}
                            aria-label={`แก้ไขฝ่าย ${department.name}`}
                          >
                            <RemixIcon icon="solar:pen-bold" width={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="ลบ">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              deleteMutation.reset();
                              setDeleting(department);
                            }}
                            aria-label={`ลบฝ่าย ${department.name}`}
                          >
                            <RemixIcon icon="solar:trash-bin-trash-bold" width={18} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
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
                  {editing ? 'แก้ไขฝ่าย' : 'เพิ่มฝ่าย'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                  {editing ? 'ปรับชื่อและคำอธิบายฝ่าย' : 'สร้างฝ่ายงานใหม่สำหรับโรงเรียน'}
                </Typography>
              </Box>
              <IconButton
                onClick={closeDialog}
                disabled={saveMutation.isPending}
                aria-label="ปิดหน้าต่าง"
              >
                <RemixIcon icon="mingcute:close-line" />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent sx={{ pt: 2 }}>
            {saveMutation.error && (
              <Alert severity="error" sx={{ mb: 2.5 }}>
                {saveMutation.error.message}
              </Alert>
            )}
            <Field.Text name="name" label="ชื่อฝ่าย *" placeholder="เช่น ฝ่ายวิชาการ" autoFocus />
            <Field.Text
              name="description"
              label="คำอธิบาย"
              placeholder="รายละเอียดหน้าที่ของฝ่าย (ถ้ามี)"
              multiline
              minRows={2}
              sx={{ mt: 2.5 }}
            />
          </DialogContent>

          <DialogActions>
            <Button color="inherit" onClick={closeDialog} disabled={saveMutation.isPending}>
              ยกเลิก
            </Button>
            <Button type="submit" variant="contained" loading={saveMutation.isPending}>
              {editing ? 'บันทึกการแก้ไข' : 'เพิ่มฝ่าย'}
            </Button>
          </DialogActions>
        </Form>
      </Dialog>

      <Dialog
        open={!!deleting}
        onClose={() => !deleteMutation.isPending && setDeleting(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>ยืนยันการลบฝ่าย</DialogTitle>
        <DialogContent>
          {deleteMutation.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteMutation.error.message}
            </Alert>
          )}
          <Typography variant="body2">
            ต้องการลบฝ่าย <strong>{deleting?.name}</strong> ใช่หรือไม่?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            สมาชิกและประกาศของฝ่ายนี้จะถูกลบตามไปด้วย การดำเนินการนี้ย้อนกลับไม่ได้
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() => setDeleting(null)}
            disabled={deleteMutation.isPending}
          >
            ยกเลิก
          </Button>
          <Button
            color="error"
            variant="contained"
            loading={deleteMutation.isPending}
            onClick={() => deleting && deleteMutation.mutate(deleting.id)}
          >
            ลบฝ่าย
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
