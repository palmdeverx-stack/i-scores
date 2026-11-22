import type { SalesDocumentFormValues } from './sales-document-form-schema';

import { useDeferredValue } from 'react';
import { useWatch, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

import { renderSalesDocumentHtml } from './sales-document-html';
import { salesDocumentFormSchema } from './sales-document-form-schema';
import { salesMoney, salesDocumentTotals, SALES_DOCUMENT_LABELS } from './sales-document-schema';

export function SalesDocumentPreview({
  documentNumber,
  issuedAt,
}: {
  documentNumber?: string | null;
  issuedAt?: string | null;
}) {
  const { control } = useFormContext<SalesDocumentFormValues>();
  const watched = useWatch({ control });
  const values = useDeferredValue(watched);
  const kind = values.kind ?? 'invoice';
  const parsed = salesDocumentFormSchema.safeParse({
    kind,
    content: {
      ...values.content,
      title: values.content?.title?.trim() || SALES_DOCUMENT_LABELS[kind],
      items:
        values.content?.items?.filter(
          (item) => item?.description?.trim() && item.quantity && item.unitPrice
        ) ?? [],
    },
  });
  const totals = parsed.success ? salesDocumentTotals(parsed.data.content) : null;
  const html = parsed.success
    ? renderSalesDocumentHtml({ ...parsed.data, documentNumber, issuedAt })
    : null;

  return (
    <Card
      variant="outlined"
      id="sales-document-preview"
      sx={{
        minWidth: 0,
        position: { xl: 'sticky' },
        top: { xl: 88 },
        scrollMarginTop: 96,
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 2,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography component="h2" variant="h6">
          พรีวิวเอกสาร
        </Typography>
        {totals && (
          <Typography variant="subtitle2">
            ยอดสุทธิ {salesMoney.format(totals.total / 100)}
          </Typography>
        )}
      </Box>
      {html ? (
        <Box
          component="iframe"
          title="พรีวิวเอกสารการขาย"
          sandbox="allow-same-origin"
          srcDoc={html}
          sx={{
            display: 'block',
            width: 1,
            height: { xs: 560, xl: 'max(480px, calc(100dvh - 185px))' },
            border: 0,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        />
      ) : (
        <Alert severity="info" sx={{ mx: 2, mb: 2 }}>
          ตรวจวันที่และจำนวนเงินในฟอร์มเพื่อแสดงพรีวิว
        </Alert>
      )}
    </Card>
  );
}
