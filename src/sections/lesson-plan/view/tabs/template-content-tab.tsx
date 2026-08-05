import type { ComponentProps } from 'react';
import type { TemplateType } from 'src/features/templates/types';

import { memo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { TemplateContentFields } from 'src/features/templates/components/template-content-fields';

import { RemixIcon } from 'src/components/remix-icon';

import { TAB_LABELS } from '../lesson-plan-form.schema';

// ----------------------------------------------------------------------

type TemplateContentFieldsProps = ComponentProps<typeof TemplateContentFields>;

type TemplateContentTabProps = {
  activeSection: string;
  activeTemplateType: TemplateType;
  isTemplateMode: boolean;
  isEditable: boolean;
  templateOptions: TemplateContentFieldsProps['templateOptions'];
  objectiveContent: TemplateContentFieldsProps['objectiveContent'];
  aiEnabled: boolean;
  onOpenAIDialog: () => void;
};

export const TemplateContentTab = memo(function TemplateContentTab({
  activeSection,
  activeTemplateType,
  isTemplateMode,
  isEditable,
  templateOptions,
  objectiveContent,
  aiEnabled,
  onOpenAIDialog,
}: TemplateContentTabProps) {
  return (
    <Card variant="outlined" sx={{ p: { xs: 2.5, sm: 3.5 }, gap: 2.5, display: 'grid' }}>
      <Box
        sx={{
          gap: 1.5,
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <Box>
          <Typography variant="h5">{TAB_LABELS[activeSection]}</Typography>
          <Typography variant="body2" color="text.secondary">
            {isTemplateMode
              ? 'ฟอร์มกลางสำหรับ Template ประเภทนี้ ข้อมูลเป็นตัวอย่างและไม่ผูกกับรายวิชา'
              : 'ใช้ฟอร์มชุดเดียวกับ Template และบันทึกข้อมูลลงในแผนการสอนนี้'}
          </Typography>
        </Box>
        {aiEnabled ? (
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<RemixIcon icon="solar:magic-stick-3-linear" />}
            onClick={onOpenAIDialog}
          >
            สร้าง/แก้ไข Step ด้วย AI
          </Button>
        ) : null}
      </Box>
      <Divider />
      <Box component="fieldset" disabled={!isEditable} sx={{ p: 0, m: 0, minWidth: 0, border: 0 }}>
        <TemplateContentFields
          templateType={activeTemplateType}
          templateOptions={templateOptions}
          contentPath={`templateSectionContents.${activeSection}`}
          studentRosterPath="evaluationStudents"
          objectiveContent={objectiveContent}
        />
      </Box>
    </Card>
  );
});
