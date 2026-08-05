import { memo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

type CharacteristicsTabProps = {
  isEditable: boolean;
};

export const CharacteristicsTab = memo(function CharacteristicsTab({
  isEditable,
}: CharacteristicsTabProps) {
  return (
    <Card variant="outlined" sx={{ gap: 2, p: { xs: 2.5, sm: 3.5 }, display: 'grid' }}>
      <Box>
        <Typography variant="h6">5. คุณลักษณะอันพึงประสงค์</Typography>
        <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
          ระบุคุณลักษณะและพฤติกรรมที่ต้องการส่งเสริมให้เกิดกับผู้เรียน
        </Typography>
      </Box>
      <Field.Editor
        name="desiredCharacteristics"
        editable={isEditable}
        placeholder="เช่น มีวินัย ใฝ่เรียนรู้ มุ่งมั่นในการทำงาน และมีจิตสาธารณะ"
      />
    </Card>
  );
});
