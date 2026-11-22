import type { SalesDocumentFormValues } from './sales-document-form-schema';

import { useWatch, useFieldArray, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

import { Field } from 'src/components/hook-form';

import { salesDocumentRequiresItems } from './sales-document-schema';
import { SalesDocumentSection, salesDocumentFieldGrid } from './sales-document-section';

const decimal = { htmlInput: { inputMode: 'decimal' as const } };

export function SalesDocumentItemsSection({
  busy,
  readOnly,
}: {
  busy: boolean;
  readOnly: boolean;
}) {
  const { control, getFieldState, formState, clearErrors } =
    useFormContext<SalesDocumentFormValues>();
  const itemsError = getFieldState('content.items', formState).error?.message;
  const kind = useWatch({ control, name: 'kind' });
  const {
    fields: lines,
    append,
    remove,
  } = useFieldArray({
    control,
    name: 'content.items',
  });

  return (
    <SalesDocumentSection
      title={salesDocumentRequiresItems(kind) ? 'รายการสินค้า / บริการ *' : 'รายการสินค้า / บริการ'}
      action={
        !readOnly && (
          <Button
            type="button"
            variant="outlined"
            size="small"
            disabled={busy || lines.length >= 50}
            onClick={() => {
              if (itemsError) clearErrors('content.items');
              append({ description: '', quantity: '1', unitPrice: '' });
            }}
          >
            เพิ่มรายการ
          </Button>
        )
      }
    >
      {itemsError && <Alert severity="error">{itemsError}</Alert>}
      {lines.map((line, index) => (
        <Box
          key={line.id}
          sx={{
            display: 'grid',
            gap: 1,
            alignItems: 'start',
            '& + &': { pt: 2, borderTop: '1px solid', borderColor: 'divider' },
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'minmax(0, 1fr) minmax(74px, .35fr) minmax(110px, .65fr) auto',
            },
          }}
        >
          <Field.Text
            size="small"
            name={`content.items.${index}.description`}
            label={`สินค้า / บริการ ${index + 1}`}
            required
            sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}
          />
          <Field.Text
            size="small"
            name={`content.items.${index}.quantity`}
            label="จำนวน"
            required
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          />
          <Field.Text
            size="small"
            name={`content.items.${index}.unitPrice`}
            label="ราคาต่อหน่วย (บาท)"
            required
            slotProps={decimal}
          />
          {!readOnly && (
            <Button
              type="button"
              size="small"
              color="error"
              aria-label={`ลบรายการ ${index + 1}`}
              onClick={() => remove(index)}
            >
              ลบ
            </Button>
          )}
        </Box>
      ))}
    </SalesDocumentSection>
  );
}

export function SalesDocumentAmountsSection() {
  return (
    <SalesDocumentSection title="ส่วนลดและภาษี">
      <Box sx={salesDocumentFieldGrid}>
        <Field.Text
          name="content.discountSatang"
          size="small"
          label="ส่วนลด (บาท)"
          slotProps={decimal}
        />
        <Field.Text
          name="content.taxBasisPoints"
          size="small"
          label="ภาษี (%)"
          slotProps={decimal}
        />
      </Box>
    </SalesDocumentSection>
  );
}
