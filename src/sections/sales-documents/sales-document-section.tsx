import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { withRequiredAsterisk } from 'src/components/hook-form/required-label';

export const salesDocumentFieldGrid = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
};

export function SalesDocumentSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card component="section" variant="outlined" sx={{ minWidth: 0 }}>
      <Box
        sx={{
          px: { xs: 2, md: 2.5 },
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography component="h2" variant="h6">
          {withRequiredAsterisk(title)}
        </Typography>
        {action}
      </Box>
      <Box sx={{ p: { xs: 2, md: 2.5 }, display: 'grid', gap: 2 }}>{children}</Box>
    </Card>
  );
}
