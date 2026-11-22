'use client';

import type { SalesParty } from './sales-seller-schema';
import type { SalesDocumentFormValues } from './sales-document-form-schema';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { salesPartyLabel } from './sales-seller-schema';
import { listSalesSellers, salesPartyQueryKey } from './sales-seller-actions';

export function SalesDocumentSellerField({
  party,
  disabled,
}: {
  party: SalesParty;
  disabled?: boolean;
}) {
  const label = salesPartyLabel[party];
  const { setValue } = useFormContext<SalesDocumentFormValues>();
  const [selected, setSelected] = useState('');
  const query = useQuery({
    queryKey: salesPartyQueryKey(party),
    queryFn: () => listSalesSellers(party),
    enabled: !disabled,
  });
  const options = (query.data ?? []).filter((seller) => seller.isActive);
  const selectedValid = options.some((seller) => `${seller.source}:${seller.id}` === selected);

  return (
    <TextField
      select
      label={`เลือก${label}จากระบบ`}
      size="small"
      value={selectedValid ? selected : ''}
      disabled={disabled || query.isPending}
      onChange={(event) => {
        const key = event.target.value;
        setSelected(key);
        const seller = options.find((option) => `${option.source}:${option.id}` === key);
        if (seller) {
          setValue(
            `content.${party}`,
            {
              name: seller.name,
              address: seller.address,
              taxId: seller.taxId,
              ...(party === 'customer'
                ? { documentEmail: seller.documentEmail ?? '' }
                : {
                    logoUrl: seller.logoUrl,
                    signatureImage: seller.signatureImage ?? '',
                    showSignature: false,
                  }),
            },
            { shouldDirty: true, shouldValidate: true }
          );
        }
      }}
      helperText={
        query.isError ? (
          `โหลดข้อมูล${label}ไม่สำเร็จ ยังกรอกเองได้`
        ) : (
          <>
            เลือกเพื่อเติมข้อมูลลงในเอกสาร ·{' '}
            <Box
              component={RouterLink}
              href={party === 'seller' ? paths.master.salesSellers : paths.master.salesCustomers}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: 'primary.main' }}
            >
              จัดการ{label}
            </Box>
          </>
        )
      }
    >
      <MenuItem value="">กรอกข้อมูล{label}เอง</MenuItem>
      {options.map((seller) => (
        <MenuItem
          key={`${seller.source}:${seller.id}`}
          value={`${seller.source}:${seller.id}`}
          sx={{ whiteSpace: 'normal' }}
        >
          {seller.name}
          {seller.source === 'platform'
            ? ' · ข้อมูลแพลตฟอร์ม'
            : seller.source === 'marketplace'
              ? ' · Marketplace'
              : ''}
        </MenuItem>
      ))}
    </TextField>
  );
}
