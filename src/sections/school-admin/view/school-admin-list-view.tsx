'use client';

import { useQuery } from '@tanstack/react-query';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
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

import { listUsers } from 'src/sections/user/user-actions';

// ----------------------------------------------------------------------

export function SchoolAdminListView() {
  const { data: schoolAdmins, isLoading } = useQuery({
    queryKey: ['users', 'school_admin'],
    queryFn: () => listUsers('school_admin'),
  });

  return (
    <Container sx={{ py: 10 }}>
      <Container
        sx={{ mb: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        disableGutters
      >
        <Typography variant="h3">ผู้ดูแลโรงเรียน</Typography>

        <Button
          component={RouterLink}
          href={paths.master.schoolAdmin.new}
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
        >
          เพิ่มผู้ดูแลโรงเรียน
        </Button>
      </Container>

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ชื่อผู้ใช้งาน</TableCell>
              <TableCell>ชื่อ-นามสกุล</TableCell>
              <TableCell>อีเมล</TableCell>
              <TableCell>โรงเรียน</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4}>กำลังโหลด...</TableCell>
              </TableRow>
            )}

            {!isLoading && !schoolAdmins?.length && (
              <TableRow>
                <TableCell colSpan={4}>ยังไม่มีผู้ดูแลโรงเรียน</TableCell>
              </TableRow>
            )}

            {schoolAdmins?.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.username}</TableCell>
                <TableCell>{`${row.first_name ?? ''} ${row.last_name ?? ''}`.trim()}</TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>{row.school?.name ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Container>
  );
}
