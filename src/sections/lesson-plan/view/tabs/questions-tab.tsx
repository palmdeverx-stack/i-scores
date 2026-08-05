import { memo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

type QuestionsTabProps = {
  isEditable: boolean;
};

export const QuestionsTab = memo(function QuestionsTab({ isEditable }: QuestionsTabProps) {
  return (
    <Card variant="outlined" sx={{ gap: 2, p: { xs: 2.5, sm: 3.5 }, display: 'grid' }}>
      <Box>
        <Typography variant="h6">6. คำถามหลัก (Big Question)</Typography>
        <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
          สร้างคำถามปลายเปิดเพื่อกระตุ้นการคิด วิเคราะห์ และเชื่อมโยงเนื้อหา
        </Typography>
      </Box>
      <Field.Editor
        name="guidingQuestions"
        editable={isEditable}
        placeholder="เพิ่มคำถามหลักและจัดเป็นรายการลำดับเลข"
      />
    </Card>
  );
});
