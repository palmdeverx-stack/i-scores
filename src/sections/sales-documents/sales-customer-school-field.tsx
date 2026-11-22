import type { SalesSellerInput } from './sales-seller-schema';
import type { SalesSeller, SalesCustomerSchool } from './sales-seller-actions';

import { Controller, useFormContext } from 'react-hook-form';

import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';

export function SalesCustomerSchoolField({
  schools,
  customers,
  currentCustomerId,
  disabled,
  loading,
  error,
}: {
  schools: SalesCustomerSchool[];
  customers: SalesSeller[];
  currentCustomerId?: string;
  disabled: boolean;
  loading: boolean;
  error: boolean;
}) {
  const { control, getValues, setValue } = useFormContext<SalesSellerInput>();
  const linkedSchoolIds = new Set(
    customers
      .filter((customer) => customer.id !== currentCustomerId)
      .map((customer) => customer.schoolId)
  );

  return (
    <Controller
      name="schoolId"
      control={control}
      render={({ field }) => (
        <Autocomplete
          options={schools}
          value={schools.find((school) => school.id === field.value) ?? null}
          loading={loading}
          disabled={disabled || loading || error}
          getOptionKey={(school) => school.id}
          getOptionLabel={(school) => `${school.name} · ${school.code}`}
          getOptionDisabled={(school) => linkedSchoolIds.has(school.id)}
          onBlur={field.onBlur}
          onChange={(_, school) => {
            field.onChange(school?.id ?? null);
            if (school && !getValues('name').trim()) {
              setValue('name', school.name, { shouldDirty: true, shouldValidate: true });
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              inputRef={field.ref}
              label="เลือกจากโรงเรียน"
              error={error}
              helperText={
                error
                  ? 'โหลดรายชื่อโรงเรียนไม่สำเร็จ'
                  : 'เลือกได้ภายหลัง โรงเรียนที่ผูกแล้วจะแสดงเป็นตัวเลือกที่ปิดไว้'
              }
            />
          )}
        />
      )}
    />
  );
}
