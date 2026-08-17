'use client';

import type { IScannerControls } from '@zxing/browser';

import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onScan: (payload: string) => void;
};

export function WorkAttendanceQrDialog({ open, pending, onClose, onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const submittedRef = useRef(false);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    if (!pending) submittedRef.current = false;
  }, [pending]);

  const submit = useCallback(
    (payload: string) => {
      const normalized = payload.trim();
      if (!normalized || submittedRef.current) return;
      submittedRef.current = true;
      controlsRef.current?.stop();
      onScan(normalized);
    },
    [onScan]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!open || !video) return undefined;
    let disposed = false;
    submittedRef.current = false;
    setCameraError('');

    import('@zxing/browser')
      .then(({ BrowserQRCodeReader }) => {
        if (disposed) return undefined;
        const reader = new BrowserQRCodeReader();
        return reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: 'environment' } } },
          video,
          (result) => {
            if (result) submit(result.getText());
          }
        );
      })
      .then((controls) => {
        if (disposed) controls?.stop();
        else controlsRef.current = controls ?? null;
      })
      .catch(() => setCameraError('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้กล้อง'));

    return () => {
      disposed = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, submit]);

  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>สแกน QR ลงเวลาประจำวัน</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          สแกน QR ที่โรงเรียนแสดงสำหรับวันนี้ จากนั้นระบบจะตรวจตำแหน่งอีกครั้ง
        </Typography>
        {cameraError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {cameraError}
          </Alert>
        )}
        <Box
          component="video"
          ref={videoRef}
          muted
          playsInline
          sx={{
            width: 1,
            minHeight: 240,
            borderRadius: 2,
            bgcolor: 'grey.900',
            objectFit: 'cover',
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button color="inherit" disabled={pending} onClick={onClose}>
          ยกเลิก
        </Button>
      </DialogActions>
    </Dialog>
  );
}
