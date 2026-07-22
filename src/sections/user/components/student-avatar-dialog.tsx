'use client';

import type { UserRow } from '../user-actions';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { Iconify } from 'src/components/iconify';
import { UploadAvatar } from 'src/components/upload';

import { uploadStudentAvatar, deleteStudentAvatar } from '../user-actions';

// ----------------------------------------------------------------------

const AVATAR_ACCEPT = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
};

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

type Props = {
  student: UserRow | null;
  onClose: () => void;
};

export function StudentAvatarDialog({ student, onClose }: Props) {
  const queryClient = useQueryClient();
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['users'] });
    onClose();
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadStudentAvatar(student!.id, file),
    onSuccess: refresh,
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteStudentAvatar(student!.id),
    onSuccess: refresh,
  });

  const pending = uploadMutation.isPending || deleteMutation.isPending;
  const error = uploadMutation.error ?? deleteMutation.error;
  const displayName = student
    ? `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || student.username
    : '';

  const handleClose = () => {
    if (pending) return;
    uploadMutation.reset();
    deleteMutation.reset();
    onClose();
  };

  return (
    <Dialog open={!!student} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>
        <Typography component="h2" variant="h6">
          รูปโปรไฟล์นักเรียน
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {displayName}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2.5 }}>
            {error.message}
          </Alert>
        )}
        <Box sx={{ py: 1, display: 'flex', justifyContent: 'center' }}>
          <UploadAvatar
            value={student?.avatar_url ?? undefined}
            loading={uploadMutation.isPending}
            disabled={pending}
            accept={AVATAR_ACCEPT}
            maxSize={MAX_AVATAR_SIZE}
            onDrop={(files) => {
              const file = files[0];
              if (file) uploadMutation.mutate(file);
            }}
            helperText={
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  คลิกหรือลากรูปมาวางเพื่อเปลี่ยนรูป
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  PNG, JPEG หรือ WEBP ขนาดไม่เกิน 2MB
                </Typography>
              </Box>
            }
          />
        </Box>
        <Alert severity="info" sx={{ mt: 2.5 }}>
          เฉพาะผู้ดูแลโรงเรียนเท่านั้นที่สามารถเปลี่ยนรูปโปรไฟล์นักเรียนได้
        </Alert>
      </DialogContent>

      <DialogActions>
        {student?.avatar_url && (
          <Button
            color="error"
            loading={deleteMutation.isPending}
            disabled={uploadMutation.isPending}
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
            onClick={() => deleteMutation.mutate()}
            sx={{ mr: 'auto' }}
          >
            ลบรูป
          </Button>
        )}
        <Button color="inherit" onClick={handleClose} disabled={pending}>
          ปิด
        </Button>
      </DialogActions>
    </Dialog>
  );
}
