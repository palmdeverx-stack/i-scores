import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { RemixIcon } from 'src/components/remix-icon';

export function InventoryFormSection({
  number,
  title,
  description,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
      <Box
        sx={{
          width: 42,
          height: 42,
          flexShrink: 0,
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
          borderRadius: 1.5,
          bgcolor: 'primary.lighter',
          color: 'primary.main',
        }}
      >
        <RemixIcon icon={icon} width={23} />
        <Box
          sx={{
            position: 'absolute',
            right: -6,
            bottom: -6,
            width: 20,
            height: 20,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'primary.main',
            color: 'common.white',
            borderRadius: '50%',
            fontSize: 11,
            fontWeight: 700,
            border: '2px solid',
            borderColor: 'background.paper',
          }}
        >
          {number}
        </Box>
      </Box>
      <Box>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {description}
        </Typography>
      </Box>
    </Box>
  );
}
