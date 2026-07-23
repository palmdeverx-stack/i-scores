'use client';

import type { RosterStudent } from '../../teacher-assignment-actions';

import { memo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { Iconify } from 'src/components/iconify';

import { StudentGuardiansDialog } from 'src/sections/student-guardian/components/student-guardians-dialog';

import { getRoster } from '../../teacher-assignment-actions';
import { StudentBreakdownDialog } from '../student-breakdown-dialog';

type Props = {
  teacherAssignmentId: string;
};

export const StudentsTab = memo(function StudentsTab({ teacherAssignmentId }: Props) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [guardianStudent, setGuardianStudent] = useState<RosterStudent | null>(null);
  const {
    data: roster,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['roster', teacherAssignmentId],
    queryFn: () => getRoster(teacherAssignmentId),
  });

  return (
    <>
      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          ไม่สามารถโหลดรายชื่อนักเรียนได้
        </Alert>
      )}
      <Card variant="outlined">
        <Box sx={{ p: 2.5 }}>
          <Typography variant="h6">รายชื่อนักเรียน</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            กดดูรายละเอียดเพื่อตรวจคะแนนและสถานะการส่งงานรายคน
          </Typography>
        </Box>
        <Divider />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>เลขที่</TableCell>
                <TableCell>ชื่อ-นามสกุล</TableCell>
                <TableCell>ชื่อผู้ใช้งาน</TableCell>
                <TableCell>ผู้ปกครอง</TableCell>
                <TableCell align="right">การจัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5}>กำลังโหลด...</TableCell>
                </TableRow>
              )}
              {!isLoading && !roster?.roster.length && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}
                  >
                    ยังไม่มีนักเรียนในห้องนี้
                  </TableCell>
                </TableRow>
              )}
              {roster?.roster.map((row) => {
                const studentName =
                  `${row.student.first_name ?? ''} ${row.student.last_name ?? ''}`.trim() ||
                  row.student.username;
                return (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.student_number ?? '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ gap: 1.25, display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          src={row.student.avatar_url ?? undefined}
                          sx={{
                            width: 34,
                            height: 34,
                            typography: 'subtitle2',
                            color: 'primary.main',
                            bgcolor: 'primary.lighter',
                          }}
                        >
                          {studentName.charAt(0)}
                        </Avatar>
                        <Typography variant="subtitle2">{studentName}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        @{row.student.username}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        color="inherit"
                        startIcon={<Iconify icon="solar:users-group-rounded-bold" />}
                        onClick={() => setGuardianStudent(row.student)}
                      >
                        ข้อมูลผู้ปกครอง
                      </Button>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setSelectedStudentId(row.student.id)}
                      >
                        ดูผลการเรียน
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <StudentBreakdownDialog
        teacherAssignmentId={teacherAssignmentId}
        studentId={selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
      />
      <StudentGuardiansDialog
        open={!!guardianStudent}
        student={guardianStudent}
        teacherAssignmentId={teacherAssignmentId}
        onClose={() => setGuardianStudent(null)}
      />
    </>
  );
});
