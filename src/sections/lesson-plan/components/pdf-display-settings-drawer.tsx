'use client';

import type { Control } from 'react-hook-form';

import { Controller } from 'react-hook-form';

import Box from '@mui/material/Box';
import Radio from '@mui/material/Radio';
import Slider from '@mui/material/Slider';
import Drawer from '@mui/material/Drawer';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import { ColorPicker } from 'src/components/color-utils';

// ----------------------------------------------------------------------

const PREFIX = 'templateSectionContents.pdfSettings';

const TEXT_COLOR_OPTIONS = [
  '#172B4D',
  '#000000',
  '#1B5E20',
  '#0D47A1',
  '#B71C1C',
  '#4A148C',
  '#37474F',
];

type PdfDisplaySettingsDrawerProps = {
  open: boolean;
  onClose: () => void;
  control: Control<any>;
  contentFontSizeDefault?: number;
  headingFontSizeDefault?: number;
};

export function PdfDisplaySettingsDrawer({
  open,
  onClose,
  control,
  contentFontSizeDefault = 9,
  headingFontSizeDefault = 10,
}: PdfDisplaySettingsDrawerProps) {

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ zIndex: (theme) => theme.zIndex.modal + 10 }}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 380 } } } }}
    >
      <Box sx={{ p: 3, gap: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6">ตั้งค่าการแสดงผลเอกสาร</Typography>
            <Typography variant="body2" color="text.secondary">
              ปรับรูปแบบของเอกสาร PDF บันทึกไว้กับแผน/Template นี้
            </Typography>
          </Box>
          <Button size="small" color="inherit" onClick={onClose}>
            ปิด
          </Button>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            ขนาดเนื้อหา
          </Typography>
          <Controller
            name={`${PREFIX}.contentFontSize`}
            control={control}
            render={({ field }) => (
              <Slider
                {...field}
                value={field.value ?? contentFontSizeDefault}
                onChange={(_, value) => field.onChange(value)}
                min={7}
                max={14}
                step={0.5}
                marks
                valueLabelDisplay="auto"
              />
            )}
          />
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            ขนาดหัวข้อ
          </Typography>
          <Controller
            name={`${PREFIX}.headingFontSize`}
            control={control}
            render={({ field }) => (
              <Slider
                {...field}
                value={field.value ?? headingFontSizeDefault}
                onChange={(_, value) => field.onChange(value)}
                min={9}
                max={20}
                step={0.5}
                marks
                valueLabelDisplay="auto"
              />
            )}
          />
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            สีตัวหนังสือ
          </Typography>
          <Controller
            name={`${PREFIX}.textColor`}
            control={control}
            render={({ field }) => (
              <ColorPicker
                value={field.value || TEXT_COLOR_OPTIONS[0]}
                onChange={(value) => field.onChange(value)}
                options={TEXT_COLOR_OPTIONS}
              />
            )}
          />
        </Box>

        <Controller
          name={`${PREFIX}.showHeadings`}
          control={control}
          render={({ field }) => (
            <FormControlLabel
              label="แสดงหัวข้อ (เช่น “1. มาตรฐานและตัวชี้วัด”)"
              control={
                <Switch
                  checked={field.value !== false}
                  onChange={(event) => field.onChange(event.target.checked)}
                />
              }
            />
          )}
        />

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            รูปแบบตัวเลข
          </Typography>
          <Controller
            name={`${PREFIX}.numeralStyle`}
            control={control}
            render={({ field }) => (
              <RadioGroup
                row
                value={field.value || 'arabic'}
                onChange={(event) => field.onChange(event.target.value)}
              >
                <FormControlLabel value="arabic" control={<Radio />} label="อาราบิก (1, 2, 3)" />
                <FormControlLabel value="thai" control={<Radio />} label="เลขไทย (๑, ๒, ๓)" />
              </RadioGroup>
            )}
          />
        </Box>
      </Box>
    </Drawer>
  );
}
