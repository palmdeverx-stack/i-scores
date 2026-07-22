'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

import { listSchools, toggleSchoolActive } from '../school-actions';

// ----------------------------------------------------------------------

export function SchoolListView() {
  const queryClient = useQueryClient();

  const { data: schools, isLoading } = useQuery({
    queryKey: ['schools'],
    queryFn: listSchools,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleSchoolActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schools'] }),
  });

  return (
    <Container sx={{ py: 10 }}>
      <Container
        sx={{ mb: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        disableGutters
      >
        <Typography variant="h3">โรงเรียน</Typography>

        <Button
          component={RouterLink}
          href={paths.master.school.new}
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
        >
          เพิ่มโรงเรียน
        </Button>
      </Container>

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>ชื่อโรงเรียน</TableCell>
              <TableCell>รหัส</TableCell>
              <TableCell align="center">ครู</TableCell>
              <TableCell align="center">นักเรียน</TableCell>
              <TableCell align="center">ห้องเรียน</TableCell>
              <TableCell align="center">รายวิชา</TableCell>
              <TableCell align="center">เปิดใช้งาน</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8}>กำลังโหลด...</TableCell>
              </TableRow>
            )}

            {!isLoading && !schools?.length && (
              <TableRow>
                <TableCell colSpan={8}>ยังไม่มีโรงเรียน</TableCell>
              </TableRow>
            )}

            {schools?.map((school) => (
              <TableRow key={school.id}>
                <TableCell>
                  <Avatar src={school.logo_url ?? undefined} alt={school.name} sx={{ mr: 2 }}>
                    {school.name.charAt(0).toUpperCase()}
                  </Avatar>
                </TableCell>
                <TableCell>{school.name}</TableCell>
                <TableCell>{school.code}</TableCell>
                <TableCell align="center">{school.teacherCount}</TableCell>
                <TableCell align="center">{school.studentCount}</TableCell>
                <TableCell align="center">{school.classroomCount}</TableCell>
                <TableCell align="center">{school.subjectCount}</TableCell>
                <TableCell align="center">
                  <Switch
                    checked={school.is_active}
                    onChange={(event) =>
                      toggleMutation.mutate({ id: school.id, isActive: event.target.checked })
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Container>
  );
}
