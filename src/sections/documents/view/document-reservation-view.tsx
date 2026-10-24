'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { rowInPage, TablePaginationCustom, useTable } from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';

import { DocumentReservationDialog } from '../components/document-reservation-dialog';
import { listMyDocuments } from '../document-actions';

export function DocumentReservationView() {
  const { user } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const table = useTable({ defaultRowsPerPage: 10 });
  const {
    data: documents = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['my-documents', user?.school_id, user?.id],
    queryFn: listMyDocuments,
  });
  const reservations = documents.filter(
    (document) =>
      (document.reserved_at || document.status === 'reserved') &&
      `${document.document_number ?? ''} ${document.title}`
        .toLocaleLowerCase('th')
        .includes(search.trim().toLocaleLowerCase('th'))
  );
  const root = user?.role === 'school_admin' ? '/admin/documents' : '/teacher/documents';
  return (
    <Container maxWidth="xl" sx={{ pb: 6 }}>
      <Button component={RouterLink} href={`${root}/my`} color="inherit" sx={{ mb: 2 }}>
        กลับหน้าเอกสารของฉัน
      </Button>
      <Typography component="h1" variant="h3">
        จองเลขเอกสารล่วงหน้า
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        จองเลขสำหรับเรื่องหรือโครงการที่วางแผนไว้ แล้วเลือกแม่แบบและเติมเนื้อหาในภายหลัง
      </Typography>
      <Box
        sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', justifyContent: 'space-between' }}
      >
        <TextField
          size="small"
          label="ค้นหาเลขเอกสาร / เรื่อง"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            table.onResetPage();
          }}
        />
        <Button
          variant="contained"
          onClick={() => {
            setOpen(true);
          }}
        >
          จองเลขใหม่
        </Button>
      </Box>
      {error ? (
        <Alert severity="error" action={<Button onClick={() => refetch()}>ลองอีกครั้ง</Button>}>
          {error.message}
        </Alert>
      ) : (
        <Card>
          <TableContainer>
            <Table sx={{ minWidth: 700 }}>
              <TableHead>
                <TableRow>
                  <TableCell>เลขที่เอกสาร</TableCell>
                  <TableCell>เรื่อง / โครงการ</TableCell>
                  <TableCell>วันที่วางแผนจัดทำ</TableCell>
                  <TableCell>สถานะ</TableCell>
                  <TableCell align="right">จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rowInPage(reservations, table.page, table.rowsPerPage).map((document) => (
                  <TableRow key={document.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {document.document_number ?? '-'}
                    </TableCell>
                    <TableCell>{document.title}</TableCell>
                    <TableCell>
                      {document.planned_date
                        ? new Date(`${document.planned_date}T00:00:00`).toLocaleDateString('th-TH')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={document.status === 'reserved' ? 'info' : 'default'}
                        label={
                          {
                            reserved: 'จองเลขแล้ว',
                            draft: 'ฉบับร่าง',
                            submitted: 'ส่งดำเนินการแล้ว',
                            ready: 'พร้อมใช้งาน',
                            cancelled: 'ยกเลิก',
                          }[document.status]
                        }
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        component={RouterLink}
                        href={`${root}/my/${document.id}`}
                        size="small"
                      >
                        {document.status === 'reserved' ? 'เติมเนื้อหา' : 'ดูเอกสาร'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!reservations.length && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      {isLoading
                        ? 'กำลังโหลดรายการ…'
                        : search
                          ? 'ไม่พบรายการที่ค้นหา'
                          : 'ยังไม่มีรายการจองเลขเอกสาร'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePaginationCustom
            page={table.page}
            rowsPerPage={table.rowsPerPage}
            count={reservations.length}
            onPageChange={table.onChangePage}
            onRowsPerPageChange={table.onChangeRowsPerPage}
          />
        </Card>
      )}
      {open && (
        <DocumentReservationDialog onClose={() => setOpen(false)} onSuccess={table.onResetPage} />
      )}
    </Container>
  );
}
