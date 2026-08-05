import { memo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

type EssentialContentTabProps = {
  isEditable: boolean;
};

export const EssentialContentTab = memo(function EssentialContentTab({
  isEditable,
}: EssentialContentTabProps) {
  return (
    <Card variant="outlined" sx={{ gap: 2, p: { xs: 2.5, sm: 3.5 }, display: 'grid' }}>
      <Box>
        <Typography variant="h6">3. สาระสำคัญ</Typography>
        <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
          จัดรูปแบบย่อหน้า ตัวหนา ลำดับเลข และหัวข้อย่อยด้วยเครื่องมือแก้ไขข้อความ
        </Typography>
      </Box>
      <Field.Editor
        name="essentialContent"
        editable={isEditable}
        placeholder="อธิบายแนวคิด เนื้อหา และสาระสำคัญของหน่วยการเรียนรู้"
      />
    </Card>
  );
});
