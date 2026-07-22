'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  label: string;
  value: string;
  icon: 'solar:gallery-wide-bold' | 'solar:check-circle-bold' | 'solar:list-bold';
  color: string;
  bgcolor: string;
};

export function ProgressSummary({ label, value, icon, color, bgcolor }: Props) {
  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ gap: 1.25, display: 'flex', alignItems: 'center' }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            display: 'grid',
            borderRadius: 1.5,
            placeItems: 'center',
            color,
            bgcolor,
          }}
        >
          <Iconify icon={icon} width={22} />
        </Box>
        <Box>
          <Typography variant="subtitle1">{value}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {label}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
}
