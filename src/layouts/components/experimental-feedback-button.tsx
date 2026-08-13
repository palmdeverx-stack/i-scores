'use client';

import type { ExperimentalFeedbackCategory } from 'src/sections/system-ui-settings/experimental-feedback-actions';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { usePathname } from 'src/routes/hooks';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import {
  RiAddLine,
  RiThumbUpLine,
  RiFeedbackLine,
  RiThumbDownLine,
  RiErrorWarningLine,
} from 'src/components/remix-icon';

import { useSystemUiSettings } from 'src/sections/system-ui-settings/use-system-ui-settings';
import { submitExperimentalFeedback } from 'src/sections/system-ui-settings/experimental-feedback-actions';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const FEEDBACK_OPTIONS: Array<{
  value: ExperimentalFeedbackCategory;
  label: string;
  icon: React.ReactNode;
}> = [
  { value: 'positive', label: 'ชอบ', icon: <RiThumbUpLine /> },
  { value: 'problem', label: 'พบปัญหา', icon: <RiErrorWarningLine /> },
  { value: 'add', label: 'อยากให้เพิ่ม', icon: <RiAddLine /> },
  { value: 'remove', label: 'ควรลด/ตัดออก', icon: <RiThumbDownLine /> },
];

const DEFAULT_EXPERIMENTAL_MENU_PATHS = ['/teacher/lesson-plans'];

function normalizePath(path: string) {
  const pathname = path.split('?')[0];
  return pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
}

export function ExperimentalFeedbackButton() {
  const pathname = usePathname();
  const { user } = useAuthContext();
  const settingsQuery = useSystemUiSettings(Boolean(user));
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ExperimentalFeedbackCategory>('positive');
  const [message, setMessage] = useState('');

  const experimentalMenuPaths =
    settingsQuery.data?.experimentalMenuPaths ?? DEFAULT_EXPERIMENTAL_MENU_PATHS;
  const currentPathname = normalizePath(pathname);
  const menuPath = [...experimentalMenuPaths]
    .sort((a, b) => b.length - a.length)
    .find((path) => {
      const menuPathname = normalizePath(path);
      return currentPathname === menuPathname || currentPathname.startsWith(`${menuPathname}/`);
    });

  const feedbackMutation = useMutation({
    mutationFn: submitExperimentalFeedback,
    onSuccess: () => {
      setOpen(false);
      setCategory('positive');
      setMessage('');
      toast.success('ขอบคุณสำหรับฟีดแบ็ก');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!user || !menuPath) return null;

  return (
    <>
      <Tooltip title="ส่งฟีดแบ็กเวอร์ชันทดลอง">
        <Button
          size="small"
          color="warning"
          variant="outlined"
          aria-label="ส่งฟีดแบ็กเวอร์ชันทดลอง"
          startIcon={<RiFeedbackLine />}
          onClick={() => setOpen(true)}
          sx={{
            ml: { xs: 0.5, sm: 1 },
            minWidth: { xs: 38, sm: 'auto' },
            minHeight: 38,
            px: { xs: 1, sm: 1.5 },
            whiteSpace: 'nowrap',
            '& .MuiButton-startIcon': { m: { xs: 0, sm: '0 8px 0 -4px' } },
          }}
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            ฟีดแบ็กเวอร์ชันทดลอง
          </Box>
        </Button>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ gap: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            ฟีดแบ็กเวอร์ชันทดลอง
            <Label color="warning">เวอร์ชันทดลอง</Label>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ gap: 2.5, pt: 1, display: 'grid' }}>
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={category}
              color="primary"
              onChange={(_, value: ExperimentalFeedbackCategory | null) => {
                if (value) setCategory(value);
              }}
              aria-label="ประเภทฟีดแบ็ก"
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' } }}
            >
              {FEEDBACK_OPTIONS.map((option) => (
                <ToggleButton
                  key={option.value}
                  value={option.value}
                  sx={{ gap: 0.75, px: 1, whiteSpace: 'nowrap' }}
                >
                  {option.icon}
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <TextField
              autoFocus
              multiline
              minRows={4}
              label="รายละเอียด"
              value={message}
              placeholder="อะไรดีหรือไม่ดี อยากให้เพิ่ม ลด หรือปรับตรงไหน..."
              slotProps={{ htmlInput: { maxLength: 2000 } }}
              helperText={`${message.trim().length}/2000 ตัวอักษร`}
              onChange={(event) => setMessage(event.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setOpen(false)}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            loading={feedbackMutation.isPending}
            disabled={message.trim().length < 3}
            onClick={() =>
              feedbackMutation.mutate({
                menuPath,
                pagePath: pathname,
                category,
                message: message.trim(),
              })
            }
          >
            ส่งฟีดแบ็ก
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
