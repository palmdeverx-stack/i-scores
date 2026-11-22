import type { SalesDocumentFormValues } from './sales-document-form-schema';

import { useWatch, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';

import { Field } from 'src/components/hook-form';

import { SalesDocumentLogoField } from './sales-document-logo-field';
import { SalesDocumentSellerField } from './sales-document-seller-field';
import { SalesDocumentSection, salesDocumentFieldGrid } from './sales-document-section';

export function SalesDocumentPartiesSection({
  busy,
  readOnly,
}: {
  busy: boolean;
  readOnly: boolean;
}) {
  const { control } = useFormContext<SalesDocumentFormValues>();
  const signature = useWatch({ control, name: 'content.seller.signatureImage' });

  return (
    <Box sx={{ ...salesDocumentFieldGrid, alignItems: 'start' }}>
      {(['seller', 'customer'] as const).map((party) => (
        <SalesDocumentSection key={party} title={party === 'seller' ? 'ผู้ขาย' : 'ลูกค้า'}>
          {!readOnly && <SalesDocumentSellerField party={party} disabled={busy} />}
          <Field.Text
            name={`content.${party}.name`}
            label={party === 'seller' ? 'ชื่อผู้ขาย' : 'ชื่อลูกค้า'}
            required
          />
          <Field.Text name={`content.${party}.address`} label="ที่อยู่" multiline minRows={2} />
          <Field.Text name={`content.${party}.taxId`} label="เลขประจำตัวผู้เสียภาษี" />
          {party === 'seller' && !readOnly && <SalesDocumentLogoField disabled={busy} />}
          {party === 'seller' && signature && (
            <Field.Switch
              name="content.seller.showSignature"
              label="แสดงลายเซ็นผู้ขายในเอกสารนี้"
              disabled={busy || readOnly}
            />
          )}
          {party === 'customer' && (
            <Field.Text name="content.customer.documentEmail" label="อีเมลรับเอกสาร" type="email" />
          )}
        </SalesDocumentSection>
      ))}
    </Box>
  );
}
