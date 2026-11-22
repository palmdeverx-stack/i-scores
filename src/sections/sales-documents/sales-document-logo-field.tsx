import type { SalesDocumentFormValues } from './sales-document-form-schema';

import { useMutation } from '@tanstack/react-query';
import { useWatch, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

import { getSalesSystemLogo } from './sales-seller-actions';

export function SalesDocumentLogoField({ disabled }: { disabled: boolean }) {
  const { control, getValues, setValue } = useFormContext<SalesDocumentFormValues>();
  const logo = useWatch({ control, name: 'content.seller.logoUrl' });
  const fetchLogo = useMutation<string, Error, SalesDocumentFormValues['content']['seller']>({
    mutationFn: async () => {
      const systemLogo = await getSalesSystemLogo();
      if (!systemLogo) throw new Error('ยังไม่มีโลโก้ในการตั้งค่าระบบ');
      return systemLogo;
    },
    onSuccess: (systemLogo, sellerAtClick) => {
      if (getValues('content.seller') === sellerAtClick) {
        setValue('content.seller.logoUrl', systemLogo, { shouldDirty: true, shouldValidate: true });
      }
    },
  });

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      {logo && (
        <Box
          component="img"
          src={logo}
          alt="โลโก้ในเอกสาร"
          referrerPolicy="no-referrer"
          sx={{ width: 88, height: 64, objectFit: 'contain' }}
        />
      )}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          type="button"
          variant="outlined"
          size="small"
          disabled={disabled}
          loading={fetchLogo.isPending}
          onClick={() => fetchLogo.mutate(getValues('content.seller'))}
        >
          ใช้โลโก้ระบบ
        </Button>
        {logo && (
          <Button
            type="button"
            size="small"
            disabled={disabled || fetchLogo.isPending}
            onClick={() => {
              fetchLogo.reset();
              setValue('content.seller.logoUrl', null, { shouldDirty: true });
            }}
          >
            เอาโลโก้ออก
          </Button>
        )}
      </Box>
      {fetchLogo.error && <Alert severity="error">{fetchLogo.error.message}</Alert>}
    </Box>
  );
}
