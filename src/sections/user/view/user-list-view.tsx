'use client';

import * as z from 'zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { listUsers, createUser } from '../user-actions';

// ----------------------------------------------------------------------

const CreateSchema = z.object({
  firstName: z.string().trim().min(1, { error: 'กรุณากรอกชื่อ!' }),
  lastName: z.string().trim().min(1, { error: 'กรุณากรอกนามสกุล!' }),
  username: z.string().trim().min(1, { error: 'กรุณากรอกชื่อผู้ใช้งาน!' }),
  email: z.union([z.literal(''), z.email({ error: 'อีเมลไม่ถูกต้อง!' })]),
  password: z.union([
    z.literal(''),
    z.string().min(6, { error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร!' }),
  ]),
  role: z.enum(['teacher', 'student']),
});

function generatePassword(length = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const values = new Uint32Array(length);
  window.crypto.getRandomValues(values);

  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
}

function maskPassword(password: string) {
  return `${'•'.repeat(Math.max(password.length - 2, 4))}${password.slice(-2)}`;
}

const ROLE_COLOR = {
  master_admin: 'error',
  school_admin: 'warning',
  teacher: 'info',
  student: 'default',
} as const;

const ROLE_LABEL = {
  master_admin: 'ผู้ดูแลระบบ',
  school_admin: 'ผู้ดูแลโรงเรียน',
  teacher: 'ครู',
  student: 'นักเรียน',
} as const;

type Props = {
  mode?: 'staff' | 'student';
};

export function UserListView({ mode = 'staff' }: Props) {
  const isStudentMode = mode === 'student';
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    data: users = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['users', mode],
    queryFn: () => (isStudentMode ? listUsers('student') : listUsers()),
  });

  const scopedUsers = useMemo(
    () => (isStudentMode ? users : users.filter((user) => user.role !== 'student')),
    [isStudentMode, users]
  );

  const methods = useForm({
    resolver: zodResolver(CreateSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      password: '',
      role: (isStudentMode ? 'student' : 'teacher') as 'student' | 'teacher',
    },
  });
  const { handleSubmit, reset, setValue } = methods;

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setDialogOpen(false);
      reset();
    },
  });

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('th');
    if (!keyword) return scopedUsers;

    return scopedUsers.filter((user) =>
      [user.username, user.email, user.first_name, user.last_name, ROLE_LABEL[user.role]]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('th')
        .includes(keyword)
    );
  }, [scopedUsers, search]);

  const closeDialog = () => {
    if (createMutation.isPending) return;
    setDialogOpen(false);
    setShowPassword(false);
    reset();
    createMutation.reset();
  };

  const copyPassword = async (userId: string, password: string) => {
    await navigator.clipboard.writeText(password);
    setCopiedUserId(userId);
    window.setTimeout(
      () => setCopiedUserId((current) => (current === userId ? null : current)),
      2000
    );
  };

  const onSubmit = handleSubmit((data) =>
    createMutation.mutate({
      ...data,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      username: data.username.trim(),
      email: data.email || undefined,
      password: data.password || generatePassword(),
      role: isStudentMode ? 'student' : 'teacher',
    })
  );

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
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
            {isStudentMode ? 'นักเรียน' : 'ผู้ใช้งาน'}
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            {isStudentMode
              ? 'จัดการบัญชีนักเรียนภายในโรงเรียน'
              : 'จัดการบัญชีบุคลากรและครูภายในโรงเรียน'}
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => {
            reset({
              firstName: '',
              lastName: '',
              username: '',
              email: '',
              password: generatePassword(),
              role: isStudentMode ? 'student' : 'teacher',
            });
            setShowPassword(true);
            createMutation.reset();
            setDialogOpen(true);
          }}
          startIcon={<Iconify icon="solar:user-plus-bold" />}
        >
          {isStudentMode ? 'เพิ่มนักเรียน' : 'เพิ่มผู้ใช้งาน'}
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
          ไม่สามารถโหลดรายการ{isStudentMode ? 'นักเรียน' : 'ผู้ใช้งาน'}ได้
        </Alert>
      )}

      <Card variant="outlined">
        <Box
          sx={{
            gap: 2,
            px: 3,
            py: 2.5,
            display: 'flex',
            alignItems: { xs: 'stretch', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            borderBottom: '1px solid',
            borderColor: 'divider',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography component="h2" variant="h6">
              รายการ{isStudentMode ? 'นักเรียน' : 'ผู้ใช้งาน'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {isLoading ? 'กำลังโหลด...' : `${filteredUsers.length} บัญชี`}
            </Typography>
          </Box>
          <TextField
            size="small"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาชื่อ ผู้ใช้ หรืออีเมล"
            aria-label={`ค้นหา${isStudentMode ? 'นักเรียน' : 'ผู้ใช้งาน'}`}
            sx={{ width: { xs: 1, sm: 320 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ชื่อผู้ใช้งาน</TableCell>
                <TableCell>ชื่อ-นามสกุล</TableCell>
                <TableCell>อีเมล</TableCell>
                <TableCell>รหัสผ่าน</TableCell>
                <TableCell>บทบาท</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5}>กำลังโหลด...</TableCell>
                </TableRow>
              )}
              {!isLoading && !filteredUsers.length && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 7, textAlign: 'center', color: 'text.secondary' }}>
                    ไม่พบ{isStudentMode ? 'นักเรียน' : 'ผู้ใช้งาน'}
                  </TableCell>
                </TableRow>
              )}
              {filteredUsers.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{row.username}</Typography>
                  </TableCell>
                  <TableCell>
                    {`${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || '-'}
                  </TableCell>
                  <TableCell>{row.email ?? '-'}</TableCell>
                  <TableCell>
                    {row.login_password ? (
                      <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center' }}>
                        <Typography
                          component="code"
                          variant="body2"
                          sx={{ fontFamily: 'monospace', letterSpacing: 0.5 }}
                        >
                          {maskPassword(row.login_password)}
                        </Typography>
                        <Tooltip title={copiedUserId === row.id ? 'คัดลอกแล้ว' : 'คัดลอกรหัสผ่าน'}>
                          <IconButton
                            size="small"
                            color={copiedUserId === row.id ? 'success' : 'default'}
                            onClick={() => copyPassword(row.id, row.login_password!)}
                            aria-label={`คัดลอกรหัสผ่านของ ${row.username}`}
                          >
                            <Iconify
                              icon={
                                copiedUserId === row.id
                                  ? 'solar:check-circle-bold'
                                  : 'solar:copy-bold'
                              }
                              width={18}
                            />
                          </IconButton>
                        </Tooltip>
                        {row.must_change_password && (
                          <Tooltip title="ยังไม่ได้เปลี่ยนรหัสผ่านนี้">
                            <Label variant="soft" color="warning" sx={{ ml: 0.5 }}>
                              ยังไม่เปลี่ยน
                            </Label>
                          </Tooltip>
                        )}
                      </Box>
                    ) : (
                      <Tooltip title="บัญชีนี้ไม่มีรหัสผ่านที่สามารถเรียกดูได้">
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          ไม่มีข้อมูล
                        </Typography>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <Label variant="soft" color={ROLE_COLOR[row.role]}>
                      {ROLE_LABEL[row.role]}
                    </Label>
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Typography component="h2" variant="h6">
                  {isStudentMode ? 'เพิ่มนักเรียน' : 'เพิ่มผู้ใช้งาน'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                  {isStudentMode ? 'สร้างบัญชีนักเรียนใหม่' : 'สร้างบัญชีใหม่สำหรับบุคลากรหรือครู'}
                </Typography>
              </Box>
              <IconButton
                onClick={closeDialog}
                disabled={createMutation.isPending}
                aria-label="ปิดหน้าต่าง"
              >
                <Iconify icon="mingcute:close-line" />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {createMutation.error && (
              <Alert severity="error" sx={{ mb: 2.5 }}>
                {createMutation.error.message}
              </Alert>
            )}
            <Box
              sx={{
                gap: 2.5,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              <Field.Text name="firstName" label="ชื่อ *" autoFocus />
              <Field.Text name="lastName" label="นามสกุล *" />
              <Field.Text
                name="username"
                label="ชื่อผู้ใช้งาน *"
                helperText="ใช้สำหรับเข้าสู่ระบบ"
              />
              <Field.Text name="email" label="อีเมล" helperText="ไม่บังคับ" />
              <Box>
                <Field.Text
                  name="password"
                  label="รหัสผ่าน (ระบบสร้างให้)"
                  type={showPassword ? 'text' : 'password'}
                  helperText="ไม่บังคับ หากเว้นว่างระบบจะสร้างรหัสผ่านให้อัตโนมัติ — ผู้ใช้งานต้องเปลี่ยนรหัสผ่านนี้ตอนเข้าสู่ระบบครั้งแรก"
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            edge="end"
                            onClick={() => setShowPassword((value) => !value)}
                            aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                          >
                            <Iconify
                              icon={showPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                            />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<Iconify icon="solar:restart-bold" />}
                  onClick={() => {
                    setValue('password', generatePassword(), {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    setShowPassword(true);
                  }}
                  sx={{ mt: 0.75 }}
                >
                  สร้างรหัสผ่านใหม่
                </Button>
              </Box>
              <Box
                sx={{
                  gap: 1.5,
                  p: 2,
                  display: 'flex',
                  borderRadius: 2,
                  alignItems: 'center',
                  bgcolor: 'background.neutral',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Iconify
                  icon={
                    isStudentMode ? 'solar:user-rounded-bold' : 'solar:users-group-rounded-bold'
                  }
                  width={26}
                />
                <Box>
                  <Typography variant="subtitle2">
                    ประเภทบัญชี: {isStudentMode ? 'นักเรียน' : 'ครู'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    กำหนดให้อัตโนมัติตามหน้าที่กำลังจัดการ
                  </Typography>
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button color="inherit" onClick={closeDialog} disabled={createMutation.isPending}>
              ยกเลิก
            </Button>
            <Button type="submit" variant="contained" loading={createMutation.isPending}>
              {isStudentMode ? 'เพิ่มนักเรียน' : 'เพิ่มผู้ใช้งาน'}
            </Button>
          </DialogActions>
        </Form>
      </Dialog>
    </Container>
  );
}
