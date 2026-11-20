'use client';

import type { ButtonProps } from '@mui/material/Button';

import { useState } from 'react';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';

import { useRouter } from 'src/routes/hooks';

import { useTranslate } from 'src/locales';

import { toast } from 'src/components/snackbar';

import { signOut } from 'src/auth/context/jwt';
import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

type Props = ButtonProps & {
  onClose?: () => void;
};

export function SignOutButton({ onClose, sx, ...other }: Props) {
  const router = useRouter();
  const { t } = useTranslate();

  const { checkUserSession } = useAuthContext();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await signOut();
      await checkUserSession?.();

      setConfirmOpen(false);
      onClose?.();
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(t('errors.signOut'));
    } finally {
      setSigningOut(false);
    }
  };

  const closeConfirm = () => {
    if (!signingOut) setConfirmOpen(false);
  };

  return (
    <>
      <Button
        fullWidth
        variant="soft"
        size="large"
        color="error"
        aria-haspopup="dialog"
        onClick={() => setConfirmOpen(true)}
        sx={sx}
        {...other}
      >
        {t('actions.signOut')}
      </Button>

      <Dialog open={confirmOpen} onClose={closeConfirm} fullWidth maxWidth="xs">
        <DialogTitle>{t('actions.confirmSignOut')}</DialogTitle>
        <DialogActions>
          <Button
            autoFocus
            color="inherit"
            variant="outlined"
            disabled={signingOut}
            onClick={closeConfirm}
          >
            {t('actions.cancel')}
          </Button>
          <Button color="error" variant="contained" loading={signingOut} onClick={handleLogout}>
            {t('actions.signOut')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
