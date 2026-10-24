'use client';

import type { UserDocument, UserDocumentStatus } from '../document-actions';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Container from '@mui/material/Container';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { toast } from 'src/components/snackbar';
import { RemixIcon } from 'src/components/remix-icon';
import { useTable, rowInPage, TablePaginationCustom } from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';

import { getSchoolDocumentTemplate } from '../document-catalog';
import { DocumentDeleteDialog } from '../components/document-delete-dialog';
import { listMyDocuments, updateMyDocumentStatus } from '../document-actions';

// ----------------------------------------------------------------------

const STATUS_CONFIG: Record<
  UserDocumentStatus,
  { label: string; color: 'default' | 'info' | 'success' | 'warning' }
> = {
  reserved: { label: 'จองเลขแล้ว', color: 'info' },
  draft: { label: 'ฉบับร่าง', color: 'warning' },
  submitted: { label: 'ส่งดำเนินการแล้ว', color: 'info' },
  ready: { label: 'พร้อมใช้งาน', color: 'success' },
  cancelled: { label: 'ยกเลิก', color: 'default' },
};

export function MyDocumentListView({
  detailBasePath = paths.admin.documents.root,
}: {
  detailBasePath?: string;
}) {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const table = useTable({ defaultRowsPerPage: 10 });
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState<{ anchor: HTMLElement; document: UserDocument } | null>(null);
  const [deletingDocument, setDeletingDocument] = useState<UserDocument | null>(null);
  const {
    data: documents = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['my-documents', user?.school_id, user?.id],
    queryFn: listMyDocuments,
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'submit' | 'cancel' }) =>
      updateMyDocumentStatus(id, action),
    onSuccess: async (document) => {
      await queryClient.invalidateQueries({ queryKey: ['my-documents'] });
      toast.success(
        document.status === 'submitted' ? 'ส่งเอกสารดำเนินการแล้ว' : 'ยกเลิกเอกสารแล้ว'
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filteredDocuments = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('th');
    if (!keyword) return documents;

    return documents.filter((document) => {
      const template = getSchoolDocumentTemplate(document.template_slug);
      return [document.title, document.purpose, template?.code, template?.name]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('th')
        .includes(keyword);
    });
  }, [documents, search]);
  const visibleDocuments = rowInPage(filteredDocuments, table.page, table.rowsPerPage);

  return (
    <Container maxWidth="xl" sx={{ pb: 6 }}>
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
            เอกสารของฉัน
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            สร้างเอกสารจากแม่แบบและติดตามสถานะเอกสารที่คุณจัดทำ
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button component={RouterLink} href={`${detailBasePath}/reserve`} variant="outlined">
            จองเลขล่วงหน้า
          </Button>
          <Button
            variant="contained"
            component={RouterLink}
            href={`${detailBasePath}/new`}
            startIcon={<RemixIcon icon="mingcute:add-line" />}
          >
            สร้างเอกสาร
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
          ไม่สามารถโหลดเอกสารของคุณได้
        </Alert>
      )}

      <Card variant="outlined">
        <Box
          sx={{
            gap: 2,
            p: 2.5,
            display: 'flex',
            alignItems: { xs: 'stretch', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography component="h2" variant="h6">
              รายการเอกสาร
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {isLoading ? 'กำลังโหลด...' : `${filteredDocuments.length} รายการ`}
            </Typography>
          </Box>
          <TextField
            size="small"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              table.onResetPage();
            }}
            placeholder="ค้นหาเอกสาร"
            sx={{ width: { xs: 1, sm: 340 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <RemixIcon icon="eva:search-fill" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        <TableContainer>
          <Table sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell>เอกสาร</TableCell>
                <TableCell>ประเภท</TableCell>
                <TableCell>วันที่สร้าง</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5}>กำลังโหลด...</TableCell>
                </TableRow>
              )}
              {!isLoading &&
                visibleDocuments.map((document) => {
                  const template = getSchoolDocumentTemplate(document.template_slug);
                  const status = STATUS_CONFIG[document.status];

                  return (
                    <TableRow key={document.id} hover>
                      <TableCell sx={{ maxWidth: 360 }}>
                        <Typography variant="subtitle2">{document.title}</Typography>
                        {document.purpose && (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {document.purpose}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{template?.code ?? '-'}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {template?.name ??
                            (document.status === 'reserved'
                              ? 'เลือกแม่แบบเมื่อเริ่มเขียน'
                              : 'ไม่พบแม่แบบ')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {formatThaiDate(document.created_at)}
                        {document.planned_date && (
                          <Typography variant="caption" component="div">
                            วางแผน {document.planned_date}
                          </Typography>
                        )}
                        {document.document_number && (
                          <Typography variant="caption" component="div">
                            เลขที่ {document.document_number}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="soft"
                          color={status.color}
                          label={status.label}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ gap: 1, display: 'flex', justifyContent: 'flex-end' }}>
                          {document.status === 'draft' && (
                            <>
                              <IconButton
                                size="small"
                                aria-label={`แก้ไข ${document.title}`}
                                component={RouterLink}
                                href={`${detailBasePath}/my/${document.id}`}
                              >
                                <RemixIcon icon="solar:pen-bold" width={18} />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                aria-label={`ลบ ${document.title}`}
                                onClick={() => setDeletingDocument(document)}
                              >
                                <RemixIcon icon="solar:trash-bin-trash-bold" width={18} />
                              </IconButton>
                            </>
                          )}
                          <IconButton
                            size="small"
                            aria-label={`เมนูเพิ่มเติม ${document.title}`}
                            aria-haspopup="menu"
                            aria-expanded={menu?.document.id === document.id ? true : undefined}
                            onClick={(event) => setMenu({ anchor: event.currentTarget, document })}
                          >
                            <RemixIcon icon="eva:more-vertical-fill" width={20} />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              {!isLoading && !filteredDocuments.length && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}
                  >
                    {documents.length
                      ? 'ไม่พบเอกสารที่ค้นหา'
                      : 'ยังไม่มีเอกสาร กด “สร้างเอกสาร” เพื่อเริ่มต้น'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePaginationCustom
          page={table.page}
          count={filteredDocuments.length}
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

      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem
          component={RouterLink}
          href={`${detailBasePath}/my/${menu?.document.id}`}
          onClick={() => setMenu(null)}
        >
          ดูเอกสาร / PDF
        </MenuItem>
        {menu && getSchoolDocumentTemplate(menu.document.template_slug) && (
          <MenuItem
            component={RouterLink}
            href={`${detailBasePath}/${menu.document.template_slug}?preview=1`}
            onClick={() => setMenu(null)}
          >
            ดูแม่แบบ
          </MenuItem>
        )}
        {menu?.document.status === 'reserved' && (
          <MenuItem
            component={RouterLink}
            href={`${detailBasePath}/my/${menu.document.id}`}
            onClick={() => setMenu(null)}
          >
            เติมเนื้อหาเลขที่จอง
          </MenuItem>
        )}
        {menu && (menu.document.status === 'reserved' || menu.document.status === 'draft') && (
          <MenuItem
            disabled={statusMutation.isPending}
            sx={{ color: menu.document.status === 'reserved' ? 'error.main' : undefined }}
            onClick={() => {
              statusMutation.mutate({
                id: menu.document.id,
                action: menu.document.status === 'reserved' ? 'cancel' : 'submit',
              });
              setMenu(null);
            }}
          >
            {menu.document.status === 'reserved' ? 'ยกเลิกการจอง' : 'ส่งดำเนินการ'}
          </MenuItem>
        )}
      </Menu>
      <DocumentDeleteDialog document={deletingDocument} onClose={() => setDeletingDocument(null)} />
    </Container>
  );
}

function formatThaiDate(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
