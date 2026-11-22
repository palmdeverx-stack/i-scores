'use client';

import type { SalesDocumentKind } from './sales-document-schema';

import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { RiArrowLeftSLine } from 'src/components/remix-icon';

import { getSalesDocument } from './sales-document-actions';
import { SalesDocumentEditor } from './sales-document-editor';
import { canEditSalesDocument } from './sales-document-schema';
import { SALES_DOCUMENT_LABELS } from './sales-document-kinds';

export function SalesDocumentEditorView({
  id,
  category,
}: {
  id?: string;
  category?: SalesDocumentKind;
}) {
  const query = useQuery({
    queryKey: ['master-sales-document', id],
    queryFn: () => getSalesDocument(id!),
    enabled: Boolean(id),
  });
  const document = query.data;
  const scopedCategory = document && category !== document.kind ? undefined : category;
  const kind = document?.kind ?? scopedCategory;
  const title = id
    ? document && !canEditSalesDocument(document)
      ? 'ดูเอกสารการขาย'
      : 'แก้ไขเอกสารการขาย'
    : kind
      ? `สร้าง${SALES_DOCUMENT_LABELS[kind]}`
      : 'สร้างเอกสารการขาย';
  const backHref = scopedCategory
    ? paths.master.salesDocumentsByKind(scopedCategory)
    : paths.master.salesDocuments;

  return (
    <Container maxWidth="xl" sx={{ pb: { xs: 5, md: 7 } }}>
      <Button
        component={RouterLink}
        href={backHref}
        color="inherit"
        startIcon={<RiArrowLeftSLine />}
        sx={{ mb: 2 }}
      >
        กลับหน้ารายการ
      </Button>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Typography component="h1" variant="h3">
          {title}
        </Typography>
        {(!id || document) && (
          <Button
            href="#sales-document-preview"
            variant="outlined"
            sx={{ display: { xl: 'none' } }}
          >
            ดูพรีวิว
          </Button>
        )}
      </Box>
      {id && query.isPending ? (
        <CircularProgress aria-label="กำลังโหลดเอกสาร" size={28} />
      ) : query.isError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={() => query.refetch()}>
              ลองอีกครั้ง
            </Button>
          }
        >
          {query.error.message}
        </Alert>
      ) : (
        <SalesDocumentEditor
          key={id ?? scopedCategory ?? 'new'}
          document={document}
          category={scopedCategory}
          backHref={backHref}
        />
      )}
    </Container>
  );
}
