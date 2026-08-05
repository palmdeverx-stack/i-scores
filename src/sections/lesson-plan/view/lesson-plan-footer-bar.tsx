import { memo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { RemixIcon } from 'src/components/remix-icon';

// ----------------------------------------------------------------------

type LessonPlanFooterBarProps = {
  title: string;
  stepIndex: number;
  stepCount: number;
  statusLabel: string;
  versionLabel: number;
  activeTabLabel: string;
  showTemplatePickerButton: boolean;
  isEditable: boolean;
  isSaving: boolean;
  returnPath: string;
  onOpenTemplatePicker: () => void;
  onPreviewPdf: () => void;
  onSaveTab: () => void;
};

export const LessonPlanFooterBar = memo(function LessonPlanFooterBar({
  title,
  stepIndex,
  stepCount,
  statusLabel,
  versionLabel,
  activeTabLabel,
  showTemplatePickerButton,
  isEditable,
  isSaving,
  returnPath,
  onOpenTemplatePicker,
  onPreviewPdf,
  onSaveTab,
}: LessonPlanFooterBarProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        p: 2,
        mt: 'auto',
        bottom: 16,
        zIndex: 5,
        position: 'sticky',
        boxShadow: (theme) => theme.vars.customShadows.z8,
      }}
    >
      <Box
        sx={{
          gap: 1,
          display: 'flex',
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column-reverse', sm: 'row' },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap variant="subtitle1" title={title}>
            {title}
          </Typography>
          <Typography variant="overline" sx={{ color: 'primary.main' }}>
            ขั้นตอนที่ {stepIndex} จาก {stepCount}
          </Typography>
          <Typography
            variant="body2"
            sx={{ display: { xs: 'none', sm: 'block' }, color: 'text.secondary' }}
          >
            {statusLabel} · เวอร์ชัน {versionLabel} · บันทึกเฉพาะ Tab “{activeTabLabel}”
          </Typography>
        </Box>
        <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {showTemplatePickerButton ? (
            <Button
              type="button"
              color="primary"
              size="large"
              variant="outlined"
              disabled={!isEditable}
              startIcon={<RemixIcon icon="solar:documents-linear" />}
              onClick={onOpenTemplatePicker}
            >
              ใช้ Template
            </Button>
          ) : null}
          <Button
            type="button"
            color="inherit"
            size="large"
            variant="outlined"
            startIcon={<RemixIcon icon="solar:printer-minimalistic-linear" />}
            onClick={onPreviewPdf}
          >
            พรีวิว PDF
          </Button>
          <Button
            component={RouterLink}
            href={returnPath}
            color="inherit"
            size="large"
            disabled={isSaving}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            size="large"
            variant="contained"
            disabled={!isEditable}
            loading={isSaving}
            startIcon={<RemixIcon icon="solar:diskette-linear" />}
            onClick={onSaveTab}
            sx={{ minWidth: 170 }}
          >
            บันทึก
          </Button>
        </Box>
      </Box>
    </Card>
  );
});
