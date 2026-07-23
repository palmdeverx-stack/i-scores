'use client';

import type { UserRow } from '../user-actions';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
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

import { StudentGuardiansDialog } from 'src/sections/student-guardian/components/student-guardians-dialog';

import { StudentFormDialog } from '../components/student-form-dialog';
import { StudentAvatarDialog } from '../components/student-avatar-dialog';
import { listUsers, updateUserActive, deleteManagedUser } from '../user-actions';

// ----------------------------------------------------------------------

function maskPassword(password: string) {
  return `${'•'.repeat(Math.max(password.length - 2, 4))}${password.slice(-2)}`;
}

export function StudentListView() {
  const table = useTable({ defaultRowsPerPage: 10 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [avatarStudent, setAvatarStudent] = useState<UserRow | null>(null);
  const [guardianStudent, setGuardianStudent] = useState<UserRow | null>(null);
  const [editingStudent, setEditingStudent] = useState<UserRow | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<UserRow | null>(null);
  const queryClient = useQueryClient();

  const {
    data: students = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['users', 'student'],
    queryFn: () => listUsers('student'),
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
      setDeletingStudent(null);
    },
  });

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('th');
    if (!keyword) return students;

    return students.filter((student) =>
      [
        student.student_code,
        student.username,
        student.email,
        student.first_name,
        student.last_name,
        student.first_name_en,
        student.last_name_en,
        student.nickname,
        student.national_id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('th')
        .includes(keyword)
    );
  }, [search, students]);

  const visibleStudents = useMemo(
    () => rowInPage(filteredStudents, table.page, table.rowsPerPage),
    [filteredStudents, table.page, table.rowsPerPage]
  );

  const copyPassword = async (studentId: string, password: string) => {
    await navigator.clipboard.writeText(password);
    setCopiedUserId(studentId);
    window.setTimeout(
      () => setCopiedUserId((current) => (current === studentId ? null : current)),
      2000
    );
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
            นักเรียน
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            จัดการบัญชี รูปโปรไฟล์ และข้อมูลผู้ปกครองของนักเรียน
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => setDialogOpen(true)}
          startIcon={<Iconify icon="solar:user-plus-bold" />}
        >
          เพิ่มนักเรียน
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
          ไม่สามารถโหลดรายการนักเรียนได้
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
              รายการนักเรียน
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {isLoading ? 'กำลังโหลด...' : `${filteredStudents.length} บัญชี`}
            </Typography>
          </Box>
          <TextField
            size="small"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              table.onResetPage();
            }}
            placeholder="ค้นหารหัสนักเรียน ชื่อ หรือผู้ใช้"
            aria-label="ค้นหานักเรียน"
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
          <Table sx={{ minWidth: 1260 }}>
            <TableHead>
              <TableRow>
                <TableCell width={88}>รูป</TableCell>
                <TableCell>รหัสนักเรียน</TableCell>
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
                  <TableCell colSpan={9}>กำลังโหลด...</TableCell>
                </TableRow>
              )}
              {!isLoading && !filteredStudents.length && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    sx={{ py: 7, textAlign: 'center', color: 'text.secondary' }}
                  >
                    ไม่พบนักเรียน
                  </TableCell>
                </TableRow>
              )}
              {visibleStudents.map((student) => (
                <TableRow key={student.id} hover>
                  <TableCell>
                    <Tooltip title="เปลี่ยนรูปโปรไฟล์">
                      <IconButton
                        onClick={() => setAvatarStudent(student)}
                        aria-label={`จัดการรูปโปรไฟล์ของ ${student.first_name ?? student.username}`}
                        sx={{ p: 0.5 }}
                      >
                        <Avatar
                          src={student.avatar_url ?? undefined}
                          alt={`${student.first_name ?? ''} ${student.last_name ?? ''}`.trim()}
                          sx={{
                            width: 42,
                            height: 42,
                            bgcolor: 'primary.lighter',
                            color: 'primary.darker',
                          }}
                        >
                          {(student.first_name ?? student.username).charAt(0).toUpperCase()}
                        </Avatar>
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2">{student.student_code ?? '-'}</Typography>
                    {student.nickname && (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        ชื่อเล่น {student.nickname}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2">{student.username}</Typography>
                  </TableCell>
                  <TableCell>
                    {`${student.name_prefix ?? ''}${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() ||
                      '-'}
                  </TableCell>
                  <TableCell>{student.email ?? '-'}</TableCell>
                  <TableCell>
                    {student.login_password ? (
                      <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center' }}>
                        <Typography
                          component="code"
                          variant="body2"
                          sx={{ fontFamily: 'monospace', letterSpacing: 0.5 }}
                        >
                          {maskPassword(student.login_password)}
                        </Typography>
                        <Tooltip
                          title={copiedUserId === student.id ? 'คัดลอกแล้ว' : 'คัดลอกรหัสผ่าน'}
                        >
                          <IconButton
                            size="small"
                            color={copiedUserId === student.id ? 'success' : 'default'}
                            onClick={() => copyPassword(student.id, student.login_password!)}
                            aria-label={`คัดลอกรหัสผ่านของ ${student.username}`}
                          >
                            <Iconify
                              icon={
                                copiedUserId === student.id
                                  ? 'solar:check-circle-bold'
                                  : 'solar:copy-bold'
                              }
                              width={18}
                            />
                          </IconButton>
                        </Tooltip>
                        {student.must_change_password && (
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
                    <Label variant="soft">นักเรียน</Label>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip
                      title={
                        (student.student_status ?? 'studying') !== 'studying'
                          ? 'เปลี่ยนสถานะเป็น “กำลังศึกษา” ก่อนเปิดใช้งาน'
                          : student.is_active === false
                            ? 'เปิดใช้งานบัญชี'
                            : 'ปิดใช้งานบัญชี'
                      }
                    >
                      <Switch
                        size="small"
                        checked={student.is_active !== false}
                        disabled={
                          (student.student_status ?? 'studying') !== 'studying' ||
                          (activeMutation.isPending && activeMutation.variables?.id === student.id)
                        }
                        onChange={(event) =>
                          activeMutation.mutate({ id: student.id, isActive: event.target.checked })
                        }
                        inputProps={{ 'aria-label': `สถานะบัญชี ${student.username}` }}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ gap: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Iconify icon="solar:users-group-rounded-bold" />}
                        onClick={() => setGuardianStudent(student)}
                      >
                        ผู้ปกครอง
                      </Button>

                      <Tooltip title="แก้ไขข้อมูลนักเรียน">
                        <IconButton
                          size="small"
                          onClick={() => setEditingStudent(student)}
                          aria-label={`แก้ไขข้อมูล ${student.first_name ?? student.username}`}
                        >
                          <Iconify icon="solar:pen-bold" width={18} />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="ลบบัญชีนักเรียน">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            deleteMutation.reset();
                            setDeletingStudent(student);
                          }}
                          aria-label={`ลบ ${student.first_name ?? student.username}`}
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
          count={filteredStudents.length}
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

      <StudentFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <StudentFormDialog
        open={!!editingStudent}
        student={editingStudent}
        onClose={() => setEditingStudent(null)}
      />
      <StudentAvatarDialog student={avatarStudent} onClose={() => setAvatarStudent(null)} />
      <StudentGuardiansDialog
        open={!!guardianStudent}
        student={guardianStudent}
        onClose={() => setGuardianStudent(null)}
      />

      <Dialog
        open={!!deletingStudent}
        onClose={() => !deleteMutation.isPending && setDeletingStudent(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>ยืนยันการลบนักเรียน</DialogTitle>
        <DialogContent>
          {deleteMutation.error ? (
            <Alert severity="error">{deleteMutation.error.message}</Alert>
          ) : (
            <>
              <Typography>
                ต้องการลบบัญชี “{deletingStudent?.student_code ?? deletingStudent?.username}”
                ใช่หรือไม่?
              </Typography>
              <Alert severity="warning" sx={{ mt: 2 }}>
                การลงทะเบียน คะแนน การเข้าเรียน และข้อมูลผู้ปกครองที่เชื่อมโยงจะถูกลบตาม
                การดำเนินการนี้ย้อนกลับไม่ได้
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() => setDeletingStudent(null)}
            disabled={deleteMutation.isPending}
          >
            ยกเลิก
          </Button>
          <Button
            color="error"
            variant="contained"
            loading={deleteMutation.isPending}
            onClick={() => deletingStudent && deleteMutation.mutate(deletingStudent.id)}
          >
            ลบนักเรียน
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
