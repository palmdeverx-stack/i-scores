'use client';

import type { UserRow, StudentStatus } from '../user-actions';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { useTable, rowInPage, TablePaginationCustom } from 'src/components/table';

import { StudentGuardiansDialog } from 'src/sections/student-guardian/components/student-guardians-dialog';

import { listUsers, updateStudentStatus } from '../user-actions';
import { CreateUserDialog } from '../components/create-user-dialog';
import { StudentAvatarDialog } from '../components/student-avatar-dialog';

// ----------------------------------------------------------------------

function maskPassword(password: string) {
  return `${'•'.repeat(Math.max(password.length - 2, 4))}${password.slice(-2)}`;
}

const STUDENT_STATUS_LABEL: Record<StudentStatus, string> = {
  studying: 'กำลังศึกษา',
  graduated: 'สำเร็จการศึกษา',
  transferred: 'ย้ายโรงเรียน',
  withdrawn: 'ลาออก',
  dismissed: 'พ้นสภาพ',
};

const STUDENT_STATUS_COLOR: Record<StudentStatus, 'success' | 'info' | 'warning' | 'error'> = {
  studying: 'success',
  graduated: 'info',
  transferred: 'warning',
  withdrawn: 'warning',
  dismissed: 'error',
};

export function StudentListView() {
  const table = useTable({ defaultRowsPerPage: 10 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [avatarStudent, setAvatarStudent] = useState<UserRow | null>(null);
  const [guardianStudent, setGuardianStudent] = useState<UserRow | null>(null);
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

  const statusMutation = useMutation({
    mutationFn: ({ studentId, status }: { studentId: string; status: StudentStatus }) =>
      updateStudentStatus(studentId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('th');
    if (!keyword) return students;

    return students.filter((student) =>
      [student.username, student.email, student.first_name, student.last_name]
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
            จัดการบัญชี รูปโปรไฟล์ สถานะ และข้อมูลผู้ปกครองของนักเรียน
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
            placeholder="ค้นหาชื่อ ผู้ใช้ หรืออีเมล"
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
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={88}>รูป</TableCell>
                <TableCell>ชื่อผู้ใช้งาน</TableCell>
                <TableCell>ชื่อ-นามสกุล</TableCell>
                <TableCell>อีเมล</TableCell>
                <TableCell>รหัสผ่าน</TableCell>
                <TableCell>บทบาท</TableCell>
                <TableCell width={180}>สถานะ</TableCell>
                <TableCell align="right">การจัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8}>กำลังโหลด...</TableCell>
                </TableRow>
              )}
              {!isLoading && !filteredStudents.length && (
                <TableRow>
                  <TableCell
                    colSpan={8}
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
                    <Typography variant="subtitle2">{student.username}</Typography>
                  </TableCell>
                  <TableCell>
                    {`${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || '-'}
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
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      fullWidth
                      value={student.student_status ?? 'studying'}
                      onChange={(event) =>
                        statusMutation.mutate({
                          studentId: student.id,
                          status: event.target.value as StudentStatus,
                        })
                      }
                      slotProps={{
                        select: {
                          renderValue: (value) => (
                            <Label
                              variant="soft"
                              color={STUDENT_STATUS_COLOR[value as StudentStatus]}
                            >
                              {STUDENT_STATUS_LABEL[value as StudentStatus]}
                            </Label>
                          ),
                        },
                      }}
                    >
                      {(Object.keys(STUDENT_STATUS_LABEL) as StudentStatus[]).map((status) => (
                        <MenuItem key={status} value={status}>
                          {STUDENT_STATUS_LABEL[status]}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Iconify icon="solar:users-group-rounded-bold" />}
                      onClick={() => setGuardianStudent(student)}
                    >
                      ผู้ปกครอง
                    </Button>
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

      <CreateUserDialog open={dialogOpen} isStudentMode onClose={() => setDialogOpen(false)} />
      <StudentAvatarDialog student={avatarStudent} onClose={() => setAvatarStudent(null)} />
      <StudentGuardiansDialog
        open={!!guardianStudent}
        student={guardianStudent}
        onClose={() => setGuardianStudent(null)}
      />
    </Container>
  );
}
