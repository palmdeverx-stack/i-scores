'use client';

import type { TemplateScope } from '../types';

import { memo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Radio from '@mui/material/Radio';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';

import { RemixIcon } from 'src/components/remix-icon';

export type PublishTemplateScope = Extract<TemplateScope, 'personal' | 'school'>;

type TemplatePublishDialogProps = {
  open: boolean;
  loading: boolean;
  canPublishSchool: boolean;
  initialScope?: PublishTemplateScope;
  onClose: () => void;
  onPublish: (scope: PublishTemplateScope) => void;
};

export const TemplatePublishDialog = memo(function TemplatePublishDialog({
  open,
  loading,
  canPublishSchool,
  initialScope = 'personal',
  onClose,
  onPublish,
}: TemplatePublishDialogProps) {
  const [scope, setScope] = useState<PublishTemplateScope>(initialScope);

  useEffect(() => {
    if (open) setScope(initialScope === 'school' && !canPublishSchool ? 'personal' : initialScope);
  }, [canPublishSchool, initialScope, open]);

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>เผยแพร่ Template</DialogTitle>
      <DialogContent dividers>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          เลือกผู้ที่สามารถค้นหาและนำ Template นี้ไปใช้ได้
        </Typography>
        <RadioGroup
          value={scope}
          onChange={(event) => setScope(event.target.value as PublishTemplateScope)}
        >
          <Box
            sx={{
              p: 2,
              mb: 1.5,
              border: '1px solid',
              borderColor: scope === 'personal' ? 'primary.main' : 'divider',
              borderRadius: 1.5,
            }}
          >
            <FormControlLabel
              value="personal"
              control={<Radio />}
              label="ส่วนตัว"
              disabled={loading}
            />
            <Typography variant="body2" color="text.secondary" sx={{ pl: 4 }}>
              เผยแพร่เพื่อใช้งานในคลังส่วนตัว เฉพาะคุณเท่านั้นที่เห็นและนำไปใช้ได้
            </Typography>
          </Box>
          <Box
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: scope === 'school' ? 'primary.main' : 'divider',
              borderRadius: 1.5,
            }}
          >
            <FormControlLabel
              value="school"
              control={<Radio />}
              label="สาธารณะภายในโรงเรียน"
              disabled={loading || !canPublishSchool}
            />
            <Typography variant="body2" color="text.secondary" sx={{ pl: 4 }}>
              ครูในโรงเรียนเดียวกันสามารถค้นหาและนำ Template นี้ไปใช้ได้
            </Typography>
          </Box>
        </RadioGroup>
        {!canPublishSchool ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            บัญชีนี้ไม่มีสิทธิ์เผยแพร่ Template ให้ทั้งโรงเรียน
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button color="inherit" disabled={loading} onClick={onClose}>
          ยกเลิก
        </Button>
        <Button
          variant="contained"
          color="success"
          disabled={scope === 'school' && !canPublishSchool}
          loading={loading}
          startIcon={<RemixIcon icon="solar:upload-minimalistic-linear" />}
          onClick={() => onPublish(scope)}
        >
          ยืนยันเผยแพร่
        </Button>
      </DialogActions>
    </Dialog>
  );
});
