'use client';

import type { SalesSeller } from './sales-seller-actions';
import type { SalesParty, SalesSellerInput } from './sales-seller-schema';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

import { SalesCustomerSchoolField } from './sales-customer-school-field';
import { salesPartyLabel, salesPartySchema } from './sales-seller-schema';
import { SalesSellerSignatureField } from './sales-seller-signature-field';
import { SalesOfficialSignatureDialog } from './sales-official-signature-dialog';
import {
  saveSalesSeller,
  listSalesSellers,
  salesPartyQueryKey,
  listSalesCustomerSchools,
  SALES_CUSTOMER_SCHOOLS_QUERY_KEY,
} from './sales-seller-actions';

function SalesSellerForm({
  party,
  seller,
  customers,
  onClose,
}: {
  party: SalesParty;
  seller?: SalesSeller;
  customers: SalesSeller[];
  onClose: () => void;
}) {
  const label = salesPartyLabel[party];
  const [readingSignature, setReadingSignature] = useState(false);
  const queryClient = useQueryClient();
  const platform = seller?.source === 'platform';
  const editing = seller?.source === 'local' || platform;
  const schools = useQuery({
    queryKey: SALES_CUSTOMER_SCHOOLS_QUERY_KEY,
    queryFn: listSalesCustomerSchools,
    enabled: party === 'customer',
  });
  const methods = useForm<SalesSellerInput>({
    resolver: zodResolver(salesPartySchema(party)),
    defaultValues: {
      name: seller?.name ?? '',
      address: seller?.address ?? '',
      taxId: seller?.taxId ?? '',
      isActive: editing ? seller.isActive : true,
      ...(platform && {
        platformLogoUrl: seller.platformLogoUrl ?? '',
        platformTransparentLogoUrl: seller.platformTransparentLogoUrl ?? '',
      }),
      ...(party === 'seller' && !platform && { signatureImage: seller?.signatureImage ?? '' }),
      ...(party === 'customer' && {
        schoolId: seller?.schoolId ?? null,
        documentEmail: seller?.documentEmail ?? '',
      }),
    },
  });
  const save = useMutation({
    mutationFn: (input: SalesSellerInput) =>
      saveSalesSeller(party, input, editing ? seller : undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesPartyQueryKey(party) });
      toast.success(`บันทึกข้อมูล${label}แล้ว`);
      onClose();
    },
  });

  return (
    <Dialog
      open
      fullWidth
      maxWidth="sm"
      onClose={() => !save.isPending && !readingSignature && onClose()}
    >
      <Form
        methods={methods}
        onSubmit={methods.handleSubmit((values) => {
          if (!readingSignature) save.mutate(values);
        })}
      >
        <DialogTitle>{editing ? `แก้ไขข้อมูล${label}` : `เพิ่ม${label}สำหรับเอกสาร`}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gap: 2, py: 2 }}>
            {save.error && <Alert severity="error">{save.error.message}</Alert>}
            {party === 'customer' && (
              <SalesCustomerSchoolField
                schools={schools.data ?? []}
                customers={customers}
                currentCustomerId={seller?.id}
                disabled={save.isPending}
                loading={schools.isPending}
                error={schools.isError}
              />
            )}
            <Field.Text
              name="name"
              label={`ชื่อ${label} / บริษัท`}
              required
              disabled={save.isPending}
            />
            <Field.Text
              name="address"
              label="ที่อยู่"
              multiline
              minRows={3}
              disabled={save.isPending}
            />
            <Field.Text name="taxId" label="เลขประจำตัวผู้เสียภาษี" disabled={save.isPending} />
            {party === 'customer' && (
              <Field.Text
                name="documentEmail"
                label="อีเมลรับเอกสาร"
                type="email"
                helperText="ระบบจะเติมอีเมลนี้เมื่อเลือกลูกค้ารายนี้ในเอกสารการขาย"
                disabled={save.isPending}
              />
            )}
            {platform && (
              <>
                <Field.Text
                  name="platformLogoUrl"
                  label="URL โลโก้หลัก"
                  type="url"
                  disabled={save.isPending}
                />
                <Field.Text
                  name="platformTransparentLogoUrl"
                  label="URL โลโก้พื้นโปร่งใส"
                  type="url"
                  disabled={save.isPending}
                />
              </>
            )}
            {party === 'seller' && !platform && (
              <SalesSellerSignatureField
                disabled={save.isPending || readingSignature}
                onReadingChange={setReadingSignature}
              />
            )}
            {!platform && (
              <Field.Switch
                name="isActive"
                label="เปิดให้เลือกในเอกสาร"
                disabled={save.isPending}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={onClose} disabled={save.isPending || readingSignature}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            type="submit"
            loading={save.isPending}
            disabled={readingSignature}
          >
            บันทึก{label}
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}

export function SalesSellersView({ party = 'seller' }: { party?: SalesParty }) {
  const label = salesPartyLabel[party];
  const [editor, setEditor] = useState<{ seller?: SalesSeller } | null>(null);
  const [signatureSeller, setSignatureSeller] = useState<SalesSeller | null>(null);
  const sellers = useQuery({
    queryKey: salesPartyQueryKey(party),
    queryFn: () => listSalesSellers(party),
  });

  return (
    <Container maxWidth="xl" sx={{ pb: { xs: 5, md: 7 } }}>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography component="h1" variant="h3">
            {party === 'customer' ? label : `ข้อมูล${label}`}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            ข้อมูลบริษัท ที่อยู่ และเลขผู้เสียภาษีสำหรับเลือกใช้ในเอกสารการขาย
          </Typography>
          {party === 'seller' && (
            <Button
              href="https://e-kru-marketplace.com/dashboard/settings/platform"
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              sx={{ mt: 1 }}
            >
              เปิดการตั้งค่าแพลตฟอร์ม
            </Button>
          )}
        </Box>
        <Button variant="contained" onClick={() => setEditor({})}>
          เพิ่ม{label}
        </Button>
      </Box>

      {sellers.error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" onClick={() => sellers.refetch()}>
              ลองอีกครั้ง
            </Button>
          }
        >
          {sellers.error.message}
        </Alert>
      )}

      <Card variant="outlined">
        <TableContainer>
          <Table
            aria-label={`ข้อมูล${label}สำหรับเอกสาร`}
            aria-busy={sellers.isFetching}
            sx={{ minWidth: 740 }}
          >
            <TableHead>
              <TableRow>
                <TableCell>{label}</TableCell>
                <TableCell>ที่อยู่</TableCell>
                <TableCell>เลขผู้เสียภาษี</TableCell>
                {party === 'customer' && <TableCell>อีเมลรับเอกสาร</TableCell>}
                <TableCell>สถานะ</TableCell>
                <TableCell align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sellers.isPending && (
                <TableRow>
                  <TableCell colSpan={party === 'customer' ? 6 : 5} align="center" sx={{ py: 5 }}>
                    กำลังโหลด{label}…
                  </TableCell>
                </TableRow>
              )}
              {sellers.isSuccess && !sellers.data.length && (
                <TableRow>
                  <TableCell colSpan={party === 'customer' ? 6 : 5} align="center" sx={{ py: 5 }}>
                    ยังไม่มีข้อมูล{label}
                  </TableCell>
                </TableRow>
              )}
              {sellers.data?.map((seller) => (
                <TableRow key={`${seller.source}:${seller.id}`} hover>
                  <TableCell component="th" scope="row" sx={{ minWidth: 180 }}>
                    <Typography variant="subtitle2">{seller.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {seller.source === 'platform'
                        ? 'ข้อมูลแพลตฟอร์มที่ใช้ร่วมกับ Marketplace'
                        : seller.source === 'marketplace'
                          ? 'ร้านทางการจาก Marketplace'
                          : seller.schoolId
                            ? 'ผูกกับโรงเรียนแล้ว'
                            : `ข้อมูล${label}ในระบบเอกสาร`}
                    </Typography>
                  </TableCell>
                  <TableCell
                    sx={{ maxWidth: 420, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                  >
                    {seller.address || '—'}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{seller.taxId || '—'}</TableCell>
                  {party === 'customer' && (
                    <TableCell sx={{ overflowWrap: 'anywhere' }}>
                      {seller.documentEmail || '—'}
                    </TableCell>
                  )}
                  <TableCell>
                    <Label color={seller.isActive ? 'success' : 'default'}>
                      {seller.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </Label>
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {party === 'seller' && seller.source !== 'local' && (
                      <Button size="small" onClick={() => setSignatureSeller(seller)}>
                        แก้ไขลายเซ็น
                      </Button>
                    )}
                    <Button size="small" onClick={() => setEditor({ seller })}>
                      {seller.source === 'marketplace' ? 'คัดลอกมาแก้ไข' : 'แก้ไข'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
      {signatureSeller && (
        <SalesOfficialSignatureDialog
          seller={signatureSeller}
          onClose={() => setSignatureSeller(null)}
        />
      )}
      {editor && (
        <SalesSellerForm
          party={party}
          seller={editor.seller}
          customers={sellers.data ?? []}
          onClose={() => setEditor(null)}
        />
      )}
    </Container>
  );
}
