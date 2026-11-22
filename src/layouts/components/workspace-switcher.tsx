'use client';

import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { Label } from 'src/components/label';
import { RiUser3Line, RiCheckLine, RiBuildingLine } from 'src/components/remix-icon';

import { useAuthContext } from 'src/auth/hooks';
import { getHomePathForRole } from 'src/auth/utils';
import { switchWorkspace } from 'src/auth/context/jwt';

type WorkspaceOption = {
  profile_id: string;
  name: string;
  code: string;
  logo_url?: string | null;
  workspace_type: 'school' | 'personal';
  access_usable?: boolean;
  access_days_remaining?: number | null;
};

const EXPIRY_WARNING_DAYS = 7;

export function WorkspaceSwitcher({ showRenewal = true }: { showRenewal?: boolean }) {
  const { user, checkUserSession } = useAuthContext();
  const [switchingProfileId, setSwitchingProfileId] = useState('');
  const [workspaceError, setWorkspaceError] = useState('');
  const workspaces: WorkspaceOption[] = Array.isArray(user?.workspaces) ? user.workspaces : [];

  const handleWorkspaceSwitch = async (profileId: string) => {
    if (profileId === user?.active_workspace_profile_id || switchingProfileId) return;
    setWorkspaceError('');
    setSwitchingProfileId(profileId);
    try {
      const result = await switchWorkspace(profileId);
      if (result.requiresPin) {
        const params = new URLSearchParams({
          pinChallengeToken: result.pinChallengeToken,
          pinRole: result.role,
        });
        window.location.assign(`${paths.auth.jwt.signIn}?${params.toString()}`);
        return;
      }
      await checkUserSession?.();
      window.location.replace(getHomePathForRole(result.role));
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'ไม่สามารถสลับพื้นที่ใช้งานได้');
      setSwitchingProfileId('');
    }
  };

  if (workspaces.length <= 1) return null;

  return (
    <>
      <Divider sx={{ borderStyle: 'dashed' }} />
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          พื้นที่ใช้งาน
        </Typography>
        <Box
          component="ul"
          aria-label="พื้นที่ใช้งาน"
          sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0.75 }}
        >
          {workspaces.map((workspace) => {
            const active = workspace.profile_id === user?.active_workspace_profile_id;
            const switching = workspace.profile_id === switchingProfileId;
            const unavailable = workspace.access_usable === false;
            const daysLeft = workspace.access_days_remaining;
            const expiring = daysLeft != null && daysLeft <= EXPIRY_WARNING_DAYS;
            const canRenew =
              showRenewal &&
              CONFIG.marketplaceUrl &&
              workspace.workspace_type === 'personal' &&
              (unavailable || expiring);
            return (
              <Box
                component="li"
                key={workspace.profile_id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  pr: canRenew ? 1 : 0,
                  border: '1px solid',
                  borderColor: active ? 'primary.main' : 'divider',
                  borderRadius: 1.5,
                  bgcolor: (theme) =>
                    active
                      ? varAlpha(theme.vars.palette.primary.mainChannel, 0.08)
                      : 'background.paper',
                }}
              >
                <ButtonBase
                  component="div"
                  aria-current={active ? 'true' : undefined}
                  disabled={Boolean(switchingProfileId)}
                  onClick={() => void handleWorkspaceSwitch(workspace.profile_id)}
                  sx={{
                    p: 1,
                    gap: 1,
                    flex: 1,
                    minWidth: 0,
                    textAlign: 'left',
                    borderRadius: 'inherit',
                    '&:hover': { bgcolor: canRenew ? 'transparent' : 'action.hover' },
                    '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main' },
                  }}
                >
                  <Avatar
                    variant="rounded"
                    src={workspace.logo_url ?? undefined}
                    sx={{
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 1,
                      bgcolor: 'background.neutral',
                      color: active ? 'primary.main' : 'text.secondary',
                      '& .MuiAvatar-img': { objectFit: 'contain', bgcolor: 'background.paper' },
                    }}
                  >
                    {workspace.workspace_type === 'personal' ? (
                      <RiUser3Line size={20} />
                    ) : (
                      <RiBuildingLine size={20} />
                    )}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ overflowWrap: 'anywhere' }}>
                      {workspace.name}
                    </Typography>
                    <Box
                      sx={{
                        minHeight: 24,
                        display: 'flex',
                        gap: 0.75,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      {workspace.workspace_type === 'school' && (
                        <Typography variant="caption" color="text.secondary">
                          {workspace.code}
                        </Typography>
                      )}
                      {unavailable ? (
                        <Label
                          color="error"
                          sx={{ height: 'auto', minHeight: 24, whiteSpace: 'normal' }}
                        >
                          หมดอายุ / ยังไม่พร้อมใช้งาน
                        </Label>
                      ) : expiring ? (
                        <Label color="warning">ใกล้หมดอายุ · เหลือ {daysLeft} วัน</Label>
                      ) : null}
                    </Box>
                  </Box>
                  {switching ? (
                    <CircularProgress size={16} />
                  ) : active ? (
                    <Box sx={{ display: 'flex', flexShrink: 0, color: 'primary.main' }}>
                      <RiCheckLine size={18} />
                    </Box>
                  ) : null}
                </ButtonBase>
                {canRenew && (
                  <Button
                    href={CONFIG.marketplaceUrl}
                    size="small"
                    variant="outlined"
                    sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                  >
                    ต่ออายุ
                  </Button>
                )}
              </Box>
            );
          })}
        </Box>
        {workspaceError && (
          <Typography role="alert" variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            {workspaceError}
          </Typography>
        )}
      </Box>
    </>
  );
}
