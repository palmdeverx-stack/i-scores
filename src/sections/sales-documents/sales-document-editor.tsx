'use client';

import type { FieldPath } from 'react-hook-form';
import type { listSalesDocuments } from './sales-document-actions';
import type { SalesDocumentFormValues } from './sales-document-form-schema';
import type { SalesDocument, SalesDocumentKind, SalesDocumentDraft } from './sales-document-schema';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { editorClasses } from 'src/components/editor/classes';

import { SalesDocumentPreview } from './sales-document-preview';
import { SalesDocumentSection } from './sales-document-section';
import { SalesDocumentDetailsSection } from './sales-document-details-section';
import { SalesDocumentPartiesSection } from './sales-document-parties-section';
import { saveSalesDocument, salesDocumentPrintUrl } from './sales-document-actions';
import { salesDocumentFormSchema, salesDocumentFormDefaults } from './sales-document-form-schema';
import {
  SalesDocumentItemsSection,
  SalesDocumentAmountsSection,
} from './sales-document-items-section';
import {
  canEditSalesDocument,
  salesDocumentIssueSchema,
  salesDocumentRequiresItems,
} from './sales-document-schema';

const documentEditorSx = {
  [`& .${editorClasses.toolbar.image}, & .${editorClasses.toolbar.link}, & .${editorClasses.toolbar.unlink}`]:
    {
      display: 'none',
    },
};

export function SalesDocumentEditor({
  document,
  category,
  backHref,
}: {
  document?: SalesDocument;
  category?: SalesDocumentKind;
  backHref: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(document);
  const [formError, setFormError] = useState('');
  const [confirmIssue, setConfirmIssue] = useState(false);
  const issued = saved?.status === 'issued';
  const readOnly = Boolean(saved && !canEditSalesDocument(saved));
  const fixedCategory = issued ? saved.kind : category;

  const methods = useForm<SalesDocumentFormValues, unknown, SalesDocumentDraft>({
    resolver: zodResolver(salesDocumentFormSchema),
    defaultValues: salesDocumentFormDefaults(document, category),
    mode: 'onBlur',
  });
  const kind = useWatch({ control: methods.control, name: 'kind' });
  const mutation = useMutation({
    mutationFn: ({ draft, issue }: { draft: SalesDocumentDraft; issue: boolean }) =>
      saveSalesDocument(draft, saved, issue),
    onSuccess: async (record) => {
      setSaved(record);
      setConfirmIssue(false);
      methods.reset(salesDocumentFormDefaults(record));
      queryClient.setQueryData(['master-sales-document', record.id], record);
      if (record.status === 'issued') {
        const listFilters = {
          queryKey: ['master-sales-documents'],
          predicate: ({ queryKey }: { queryKey: readonly unknown[] }) =>
            typeof queryKey[1] === 'number',
        };
        await queryClient.cancelQueries(listFilters);
        const lists =
          queryClient.getQueriesData<Awaited<ReturnType<typeof listSalesDocuments>>>(listFilters);
        for (const [key, list] of lists) {
          if (!list?.documents.some((row) => row.id === record.id)) continue;

          queryClient.setQueryData(key, {
            ...list,
            ...(key[3] === 'draft'
              ? {
                  documents: list.documents.filter((row) => row.id !== record.id),
                  total: Math.max(0, list.total - 1),
                }
              : {
                  documents: list.documents.map((row) =>
                    row.id === record.id
                      ? {
                          ...row,
                          kind: record.kind,
                          status: record.status,
                          document_number: record.document_number,
                          title: record.content.title,
                          customer: record.content.customer.name,
                          date: record.content.documentDate,
                          total_satang: record.total_satang,
                          updated_at: record.updated_at,
                        }
                      : row
                  ),
                }),
          });
        }
      }
      void queryClient.invalidateQueries({ queryKey: ['master-sales-documents'] });
      if (record.status === 'draft') toast.success('บันทึกแบบร่างสำเร็จ');
      if (record.status === 'issued' && issued) toast.success('บันทึกการแก้ไขสำเร็จ');
      if (!saved) router.replace(paths.master.salesDocumentEdit(record.id, category));
    },
    onError: (error: Error) => {
      setConfirmIssue(false);
      setFormError(error.message);
    },
  });
  const busy = mutation.isPending;

  function validateForIssue(draft: SalesDocumentDraft) {
    const result = salesDocumentIssueSchema.safeParse(draft);
    if (result.success) return true;

    result.error.issues.forEach((issue, index) => {
      methods.setError(
        issue.path.join('.') as FieldPath<SalesDocumentFormValues>,
        { type: 'custom', message: issue.message },
        { shouldFocus: index === 0 }
      );
    });
    setFormError(result.error.issues[0]?.message ?? 'กรุณาตรวจข้อมูลก่อนออกเอกสาร');
    return false;
  }

  const submit = (issue: boolean) =>
    methods.handleSubmit(
      (draft) => {
        setFormError('');
        const scopedDraft = fixedCategory ? { ...draft, kind: fixedCategory } : draft;
        if ((issue || issued) && !validateForIssue(scopedDraft)) {
          setConfirmIssue(false);
          return;
        }
        mutation.mutate({ draft: scopedDraft, issue });
      },
      () => {
        setConfirmIssue(false);
        setFormError('กรุณาตรวจข้อมูลในช่องที่มีข้อความแจ้งเตือน');
      }
    );

  const openIssueConfirmation = methods.handleSubmit(
    (draft) => {
      setFormError('');
      if (validateForIssue(fixedCategory ? { ...draft, kind: fixedCategory } : draft)) {
        setConfirmIssue(true);
      }
    },
    () => setFormError('กรุณาตรวจข้อมูลในช่องที่มีข้อความแจ้งเตือน')
  );

  return (
    <>
      <Form methods={methods} onSubmit={submit(false)}>
        <Button
          href="#sales-document-preview"
          variant="outlined"
          sx={{ display: { xs: 'inline-flex', xl: 'none' }, mb: 2 }}
        >
          ไปที่พรีวิวเอกสาร
        </Button>
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            alignItems: 'start',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', xl: 'minmax(0, 1.1fr) minmax(0, 1fr)' },
          }}
        >
          <Box
            component="fieldset"
            disabled={busy || readOnly}
            sx={{ border: 0, p: 0, m: 0, minWidth: 0, display: 'grid', gap: 2.5 }}
          >
            <SalesDocumentDetailsSection category={fixedCategory} disabled={busy || readOnly} />
            <SalesDocumentPartiesSection busy={busy} readOnly={readOnly} />
            <SalesDocumentItemsSection busy={busy} readOnly={readOnly} />
            <SalesDocumentAmountsSection />
            {salesDocumentRequiresItems(kind) && (
              <SalesDocumentSection title="รายละเอียด">
                <Field.Editor
                  name="content.details"
                  placeholder="กรอกรายละเอียดเอกสาร"
                  editorProps={{ attributes: { 'aria-label': 'รายละเอียดเอกสาร' } }}
                  parseOptions={{ preserveWhitespace: 'full' }}
                  editable={!busy && !readOnly}
                  changeDelay={0}
                  sx={documentEditorSx}
                />
              </SalesDocumentSection>
            )}
            <SalesDocumentSection title={kind === 'contract' ? 'เงื่อนไข *' : 'เงื่อนไข'}>
              <Field.Editor
                name="content.conditions"
                editorProps={{ attributes: { 'aria-label': 'เงื่อนไข' } }}
                parseOptions={{ preserveWhitespace: 'full' }}
                placeholder={kind === 'contract' ? 'กรอกเงื่อนไขของสัญญา' : 'กรอกเงื่อนไข'}
                editable={!busy && !readOnly}
                changeDelay={0}
                sx={documentEditorSx}
              />
            </SalesDocumentSection>
            <SalesDocumentSection title="หมายเหตุ">
              <Field.Editor
                name="content.notes"
                editorProps={{ attributes: { 'aria-label': 'หมายเหตุ' } }}
                parseOptions={{ preserveWhitespace: 'full' }}
                placeholder="กรอกหมายเหตุ"
                editable={!busy && !readOnly}
                changeDelay={0}
                sx={documentEditorSx}
              />
            </SalesDocumentSection>
          </Box>

          <SalesDocumentPreview
            documentNumber={saved?.document_number}
            issuedAt={saved?.issued_at}
          />
        </Box>

        <Box
          sx={{
            mt: formError ? 1.5 : 3,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            justifyContent: 'flex-end',
          }}
        >
          {saved && (
            <Button
              href={salesDocumentPrintUrl(saved.id)}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ mr: 'auto' }}
            >
              ดู / พิมพ์ฉบับที่บันทึก
            </Button>
          )}
          <Button component={RouterLink} color="inherit" href={backHref} disabled={busy}>
            กลับหน้ารายการ
          </Button>
          {!readOnly && (
            <>
              <Button type="submit" variant={saved ? 'outlined' : 'contained'} loading={busy}>
                {issued ? 'บันทึกการแก้ไข' : 'บันทึกแบบร่าง'}
              </Button>
              {saved && !issued && (
                <Button
                  type="button"
                  variant="contained"
                  disabled={busy}
                  onClick={openIssueConfirmation}
                >
                  ออกเอกสาร
                </Button>
              )}
            </>
          )}
        </Box>
      </Form>

      <Dialog
        open={confirmIssue}
        onClose={() => !busy && setConfirmIssue(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>ยืนยันออกเอกสาร</DialogTitle>
        <DialogContent>
          {kind === 'quotation'
            ? 'ระบบจะออกเลขใบเสนอราคา โปรดตรวจผู้ขาย ลูกค้า และยอดเงินก่อนยืนยัน'
            : 'ระบบจะออกเลขและล็อกเอกสาร โปรดตรวจผู้ขาย ลูกค้า และยอดเงินก่อนยืนยัน'}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" disabled={busy} onClick={() => setConfirmIssue(false)}>
            กลับไปตรวจ
          </Button>
          <Button variant="contained" loading={busy} onClick={submit(true)}>
            ยืนยันออกเอกสาร
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
