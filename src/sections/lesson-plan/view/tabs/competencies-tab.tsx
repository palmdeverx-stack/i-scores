import { memo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

type CompetenciesTabProps = {
  isEditable: boolean;
};

export const CompetenciesTab = memo(function CompetenciesTab({
  isEditable,
}: CompetenciesTabProps) {
  return (
    <Card variant="outlined" sx={{ gap: 2, p: { xs: 2.5, sm: 3.5 }, display: 'grid' }}>
      <Box>
        <Typography variant="h6">4. สมรรถนะสำคัญของผู้เรียน</Typography>
        <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
          ระบุสมรรถนะและพฤติกรรมที่ผู้เรียนจะพัฒนาจากแผนการสอนนี้
        </Typography>
      </Box>
      <Field.Editor
        name="learnerCompetencies"
        editable={isEditable}
        placeholder="เช่น ความสามารถในการสื่อสาร การคิด การแก้ปัญหา การใช้ทักษะชีวิต และการใช้เทคโนโลยี"
      />
    </Card>
  );
});
