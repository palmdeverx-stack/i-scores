import type { SalesSellerInput } from './sales-seller-schema';

import { useState } from 'react';
import { useWatch, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { salesSignatureSchema, SALES_SIGNATURE_MAX_BYTES } from './sales-signature-schema';

export function SalesSellerSignatureField({
  disabled,
  onReadingChange,
}: {
  disabled: boolean;
  onReadingChange: (reading: boolean) => void;
}) {
  const { control, setValue } = useFormContext<SalesSellerInput>();
  const signature = useWatch({ control, name: 'signatureImage' });
  const [error, setError] = useState('');

  function readFile(file: File) {
    setError('');
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > SALES_SIGNATURE_MAX_BYTES) {
      setError('เลือกไฟล์ PNG หรือ JPEG ขนาดไม่เกิน 256 KB');
      return;
    }
    onReadingChange(true);
    const reader = new FileReader();
    reader.onload = () => {
      const image = salesSignatureSchema.safeParse(reader.result);
      if (image.success) setValue('signatureImage', image.data, { shouldDirty: true });
      else setError('ไฟล์ลายเซ็นไม่ถูกต้อง');
    };
    reader.onerror = () => setError('อ่านไฟล์ลายเซ็นไม่สำเร็จ');
    reader.onloadend = () => onReadingChange(false);
    reader.readAsDataURL(file);
  }

  return (
    <Box sx={{ display: 'grid', gap: 1.25 }}>
      <Typography variant="subtitle2">ลายเซ็นอิเล็กทรอนิกส์</Typography>
      {signature && (
        <Box
          component="img"
          src={signature}
          alt="ลายเซ็นผู้ขาย"
          sx={{
            width: 180,
            height: 72,
            objectFit: 'contain',
            bgcolor: 'common.white',
            borderRadius: 1,
          }}
        />
      )}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button component="label" variant="outlined" disabled={disabled}>
          {signature ? 'เปลี่ยนลายเซ็น' : 'อัปโหลดลายเซ็น'}
          <input
            hidden
            type="file"
            accept="image/png,image/jpeg"
            disabled={disabled}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              if (file) readFile(file);
            }}
          />
        </Button>
        {signature && (
          <Button
            type="button"
            color="error"
            disabled={disabled}
            onClick={() => {
              setError('');
              setValue('signatureImage', '', { shouldDirty: true });
            }}
          >
            เอาลายเซ็นออก
          </Button>
        )}
      </Box>
      <Typography variant="caption" color="text.secondary">
        PNG หรือ JPEG ขนาดไม่เกิน 256 KB
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
    </Box>
  );
}
