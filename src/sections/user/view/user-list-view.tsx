'use client';

import type { UserRow } from '../user-actions';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
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
import { useTable, rowInPage, TablePaginationCustom } from 'src/components/table';

import { CreateUserDialog } from '../components/create-user-dialog';
import { listUsers, updateUserActive, deleteManagedUser } from '../user-actions';

// ----------------------------------------------------------------------

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

export function UserListView() {
  const table = useTable({ defaultRowsPerPage: 10 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
  const queryClient = useQueryClient();

  const {
    data: users = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['users', 'staff'],
    queryFn: () => listUsers(),
  });

  const activeMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateUserActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteManagedUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeletingUser(null);
    },
  });

  const staffUsers = useMemo(() => users.filter((user) => user.role !== 'student'), [users]);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('th');
    if (!keyword) return staffUsers;

    return staffUsers.filter((user) =>
      [user.username, user.email, user.first_name, user.last_name, ROLE_LABEL[user.role]]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('th')
        .includes(keyword)
    );
  }, [search, staffUsers]);

  const visibleUsers = useMemo(
    () => rowInPage(filteredUsers, table.page, table.rowsPerPage),
    [filteredUsers, table.page, table.rowsPerPage]
  );

  const copyPassword = async (userId: string, password: string) => {
    await navigator.clipboard.writeText(password);
    setCopiedUserId(userId);
    window.setTimeout(
      () => setCopiedUserId((current) => (current === userId ? null : current)),
      2000
    );
  };

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
            ครู/บุคลากร
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            จัดการบัญชีบุคลากรและครูภายในโรงเรียน
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => setDialogOpen(true)}
          startIcon={<Iconify icon="solar:user-plus-bold" />}
        >
          เพิ่มครู/บุคลากร
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
          ไม่สามารถโหลดรายการผู้ใช้งานได้
        </Alert>
      )}
      {activeMutation.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {activeMutation.error.message}
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
              รายการครู/บุคลากร
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {isLoading ? 'กำลังโหลด...' : `${filteredUsers.length} บัญชี`}
            </Typography>
          </Box>
          <TextField
            size="small"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              table.onResetPage();
            }}
            placeholder="ค้นหาชื่อ ผู้ใช้ หรืออีเมล"
            aria-label="ค้นหาผู้ใช้งาน"
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
          <Table sx={{ minWidth: 980 }}>
            <TableHead>
              <TableRow>
                <TableCell>ชื่อผู้ใช้งาน</TableCell>
                <TableCell>ชื่อ-นามสกุล</TableCell>
                <TableCell>อีเมล</TableCell>
                <TableCell>รหัสผ่าน</TableCell>
                <TableCell>บทบาท</TableCell>
                <TableCell align="center">เข้าใช้งาน</TableCell>
                <TableCell align="right">การจัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7}>กำลังโหลด...</TableCell>
                </TableRow>
              )}
              {!isLoading && !filteredUsers.length && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    sx={{ py: 7, textAlign: 'center', color: 'text.secondary' }}
                  >
                    ไม่พบผู้ใช้งาน
                  </TableCell>
                </TableRow>
              )}
              {visibleUsers.map((user: UserRow) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{user.username}</Typography>
                  </TableCell>
                  <TableCell>
                    {`${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || '-'}
                  </TableCell>
                  <TableCell>{user.email ?? '-'}</TableCell>
                  <TableCell>
                    {user.login_password ? (
                      <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center' }}>
                        <Typography
                          component="code"
                          variant="body2"
                          sx={{ fontFamily: 'monospace', letterSpacing: 0.5 }}
                        >
                          {maskPassword(user.login_password)}
                        </Typography>
                        <Tooltip title={copiedUserId === user.id ? 'คัดลอกแล้ว' : 'คัดลอกรหัสผ่าน'}>
                          <IconButton
                            size="small"
                            color={copiedUserId === user.id ? 'success' : 'default'}
                            onClick={() => copyPassword(user.id, user.login_password!)}
                            aria-label={`คัดลอกรหัสผ่านของ ${user.username}`}
                          >
                            <Iconify
                              icon={
                                copiedUserId === user.id
                                  ? 'solar:check-circle-bold'
                                  : 'solar:copy-bold'
                              }
                              width={18}
                            />
                          </IconButton>
                        </Tooltip>
                        {user.must_change_password && (
                          <Tooltip title="ยังไม่ได้เปลี่ยนรหัสผ่านนี้">
                            <Label variant="soft" color="warning" sx={{ ml: 0.5 }}>
                              ยังไม่เปลี่ยน
                            </Label>
                          </Tooltip>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        ไม่มีข้อมูล
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Label variant="soft" color={ROLE_COLOR[user.role]}>
                      {ROLE_LABEL[user.role]}
                    </Label>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip
                      title={user.is_active === false ? 'เปิดใช้งานบัญชี' : 'ปิดใช้งานบัญชี'}
                    >
                      <Switch
                        size="small"
                        checked={user.is_active !== false}
                        disabled={
                          activeMutation.isPending && activeMutation.variables?.id === user.id
                        }
                        onChange={(event) =>
                          activeMutation.mutate({ id: user.id, isActive: event.target.checked })
                        }
                        inputProps={{ 'aria-label': `สถานะบัญชี ${user.username}` }}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Tooltip title="แก้ไขบัญชี">
                        <IconButton
                          size="small"
                          onClick={() => setEditingUser(user)}
                          aria-label={`แก้ไข ${user.username}`}
                        >
                          <Iconify icon="solar:pen-bold" width={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="ลบบัญชี">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            deleteMutation.reset();
                            setDeletingUser(user);
                          }}
                          aria-label={`ลบ ${user.username}`}
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

        <TablePaginationCustom
          page={table.page}
          count={filteredUsers.length}
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

      <CreateUserDialog
        open={dialogOpen}
        isStudentMode={false}
        onClose={() => setDialogOpen(false)}
      />
      <CreateUserDialog
        open={!!editingUser}
        isStudentMode={false}
        user={editingUser}
        onClose={() => setEditingUser(null)}
      />

      <Dialog
        open={!!deletingUser}
        onClose={() => !deleteMutation.isPending && setDeletingUser(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>ยืนยันการลบบัญชี</DialogTitle>
        <DialogContent>
          {deleteMutation.error ? (
            <Alert severity="error">{deleteMutation.error.message}</Alert>
          ) : (
            <>
              <Typography>ต้องการลบบัญชี “{deletingUser?.username}” ใช่หรือไม่?</Typography>
              <Alert severity="warning" sx={{ mt: 2 }}>
                ข้อมูลการสอนที่เชื่อมโยงอาจถูกลบตาม การดำเนินการนี้ย้อนกลับไม่ได้
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() => setDeletingUser(null)}
            disabled={deleteMutation.isPending}
          >
            ยกเลิก
          </Button>
          <Button
            color="error"
            variant="contained"
            loading={deleteMutation.isPending}
            onClick={() => deletingUser && deleteMutation.mutate(deletingUser.id)}
          >
            ลบบัญชี
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
