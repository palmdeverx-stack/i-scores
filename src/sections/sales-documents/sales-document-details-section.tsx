import type { SalesDocumentKind } from './sales-document-schema';
import type { SalesDocumentFormValues } from './sales-document-form-schema';

import dayjs from 'dayjs';
import { useWatch, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';

import { Field } from 'src/components/hook-form';

import { SalesDocumentReferenceField } from './sales-document-reference-field';
import { salesDocumentKind, SALES_DOCUMENT_LABELS } from './sales-document-schema';
import { SalesDocumentSection, salesDocumentFieldGrid } from './sales-document-section';

export function SalesDocumentDetailsSection({
  category,
  disabled,
}: {
  category?: SalesDocumentKind;
  disabled: boolean;
}) {
  const { control } = useFormContext<SalesDocumentFormValues>();
  const documentDate = useWatch({ control, name: 'content.documentDate' });
  const minDueDate = dayjs(documentDate);

  return (
    <SalesDocumentSection title="ข้อมูลเอกสาร">
      <Box sx={salesDocumentFieldGrid}>
        {!category && (
          <Field.Select name="kind" label="ประเภทเอกสาร">
            {salesDocumentKind.options.map((kind) => (
              <MenuItem key={kind} value={kind}>
                {SALES_DOCUMENT_LABELS[kind]}
              </MenuItem>
            ))}
          </Field.Select>
        )}
        <Field.Text
          name="content.title"
          label="ชื่อเรื่อง"
          required
          sx={category ? { gridColumn: '1 / -1' } : undefined}
        />
        <Field.DatePicker
          name="content.documentDate"
          label="วันที่เอกสาร"
          format="DD/MM/YYYY"
          required
          slotProps={{ textField: { fullWidth: true } }}
        />
        <Field.DatePicker
          name="content.dueDate"
          label="วันครบกำหนด"
          format="DD/MM/YYYY"
          minDate={minDueDate.isValid() ? minDueDate : undefined}
          slotProps={{ field: { clearable: true }, textField: { fullWidth: true } }}
        />
        <Box sx={{ gridColumn: '1 / -1' }}>
          <SalesDocumentReferenceField disabled={disabled} />
        </Box>
      </Box>
    </SalesDocumentSection>
  );
}
