'use client';

import type { ButtonProps } from '@mui/material/Button';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';

import { CONFIG } from 'src/global-config';

import { RiStore2Line, RiExternalLinkLine } from 'src/components/remix-icon';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const MARKETPLACE_ROLES = ['master_admin', 'school_admin', 'teacher'];

export function MarketplaceButton({ sx, ...other }: ButtonProps) {
  const { user } = useAuthContext();
  const canAccess = Boolean(user?.role && MARKETPLACE_ROLES.includes(user.role));
  const isConfigured = Boolean(CONFIG.marketplaceUrl);

  if (!canAccess) return null;

  return (
    <Tooltip
      title={isConfigured ? 'เปิด Marketplace' : 'ยังไม่ได้กำหนด NEXT_PUBLIC_MARKETPLACE_URL'}
    >
      <Box component="span" sx={{ display: 'inline-flex' }}>
        <Button
          component={isConfigured ? 'a' : 'button'}
          href={isConfigured ? CONFIG.marketplaceUrl : undefined}
          target={isConfigured ? '_blank' : undefined}
          rel={isConfigured ? 'noopener noreferrer' : undefined}
          disabled={!isConfigured}
          size="small"
          variant="outlined"
          startIcon={<RiStore2Line />}
          endIcon={
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              <RiExternalLinkLine />
            </Box>
          }
          sx={[
            {
              minWidth: { xs: 38, sm: 'auto' },
              minHeight: 38,
              px: { xs: 1, sm: 1.5 },
              whiteSpace: 'nowrap',
              '& .MuiButton-startIcon': {
                m: { xs: 0, sm: '0 8px 0 -4px' },
              },
              '& .MuiButton-endIcon': {
                m: { xs: 0, sm: '0 -4px 0 8px' },
              },
            },
            ...(Array.isArray(sx) ? sx : [sx]),
          ]}
          {...other}
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            Marketplace
          </Box>
        </Button>
      </Box>
    </Tooltip>
  );
}
