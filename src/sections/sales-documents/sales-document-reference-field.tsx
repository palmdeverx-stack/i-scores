'use client';

import type { SalesDocumentFormValues } from './sales-document-form-schema';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from 'minimal-shared/hooks';
import { useController, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';

import { listSalesDocuments } from './sales-document-actions';
import { SALES_DOCUMENT_LABELS } from './sales-document-kinds';

export function SalesDocumentReferenceField({ disabled }: { disabled?: boolean }) {
  const { control } = useFormContext<SalesDocumentFormValues>();
  const { field, fieldState } = useController({ control, name: 'content.reference' });
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const number = useDebounce(search.trim(), 250);
  const validSearch = !number || /^[a-z0-9-]{1,120}$/i.test(number);
  const query = useQuery({
    queryKey: ['master-sales-documents', 'references', number],
    queryFn: ({ signal }) => listSalesDocuments(0, '', 'issued', number, signal),
    enabled: open && !disabled && validSearch,
  });
  const searching = open && validSearch && (number !== search.trim() || query.isFetching);
  const options =
    searching || !validSearch
      ? []
      : (query.data?.documents ?? []).filter((document) => Boolean(document.document_number));

  return (
    <Autocomplete
      freeSolo
      forcePopupIcon
      disabled={disabled}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => {
        setSearch('');
        setOpen(false);
      }}
      options={options}
      loading={searching}
      loadingText="กำลังค้นหาเอกสาร…"
      value={field.value || null}
      inputValue={field.value}
      filterOptions={(items) => items}
      getOptionLabel={(item) => (typeof item === 'string' ? item : (item.document_number ?? ''))}
      isOptionEqualToValue={(option, value) => option.document_number === value.document_number}
      onInputChange={(_, value, reason) => {
        if (reason === 'input' || reason === 'clear') {
          field.onChange(value);
          setSearch(value);
        }
      }}
      onChange={(_, item) =>
        field.onChange(typeof item === 'string' ? item : (item?.document_number ?? ''))
      }
      sx={{ gridColumn: '1 / -1' }}
      renderOption={(params, item) => {
        const { key, ...optionProps } = params;
        return (
          <Box component="li" key={key} {...optionProps}>
            <Box sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              <Typography variant="subtitle2">{item.document_number}</Typography>
              <Typography variant="caption" color="text.secondary">
                {SALES_DOCUMENT_LABELS[item.kind]} · {item.title}
                {item.customer ? ` · ${item.customer}` : ''}
              </Typography>
            </Box>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          name={field.name}
          inputRef={field.ref}
          onBlur={field.onBlur}
          label="เลขอ้างอิง"
          error={Boolean(fieldState.error)}
          helperText={
            fieldState.error?.message ??
            (query.isError
              ? 'โหลดรายการเอกสารไม่สำเร็จ ยังพิมพ์เลขอ้างอิงเองได้'
              : 'เลือกหรือค้นหาจากเลขเอกสารที่ออกแล้ว หรือกรอกเลขอ้างอิงเอง')
          }
        />
      )}
    />
  );
}
