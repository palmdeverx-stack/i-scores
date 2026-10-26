'use client';

import type { NotificationComposeValues } from '../notification-compose-schema';

import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks';

import { NotificationComposeSchema } from '../notification-compose-schema';
import { sendInternalNotification, loadNotificationRecipients } from '../notification-actions';

export function NotificationComposeDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuthContext();
  const client = useQueryClient();
  const retry = useRef<{ payload: string; id: string } | null>(null);
  const methods = useForm<NotificationComposeValues>({
    resolver: zodResolver(NotificationComposeSchema),
    defaultValues: { title: '', body: '', recipientIds: [] },
  });
  const recipients = useQuery({
    queryKey: ['notification-recipients', user?.school_id, user?.id],
    queryFn: loadNotificationRecipients,
  });
  const mutation = useMutation({
    mutationFn: async (values: NotificationComposeValues) => {
      const payload = JSON.stringify(values);
      if (retry.current?.payload !== payload) retry.current = { payload, id: crypto.randomUUID() };
      await sendInternalNotification({ ...values, id: retry.current.id });
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('ส่งการแจ้งเตือนแล้ว');
      onClose();
    },
  });
  return (
    <Dialog
      open
      fullWidth
      maxWidth="sm"
      onClose={() => {
        if (!mutation.isPending) onClose();
      }}
    >
      <DialogTitle>ส่งการแจ้งเตือนภายในโรงเรียน</DialogTitle>
      <DialogContent>
        <Form
          methods={methods}
          onSubmit={methods.handleSubmit((values) => {
            if (!mutation.isPending) mutation.mutate(values);
          })}
        >
          <Box sx={{ pt: 1, display: 'grid', gap: 2.5 }}>
            <Field.Autocomplete
              name="recipientIds"
              label="ผู้รับ"
              required
              multiple
              options={recipients.data ?? []}
              loading={recipients.isLoading}
              disabled={mutation.isPending}
            />
            {recipients.error && (
              <Alert
                severity="error"
                action={<Button onClick={() => recipients.refetch()}>ลองใหม่</Button>}
              >
                {recipients.error.message}
              </Alert>
            )}
            <Field.Text
              name="title"
              label="หัวข้อ"
              required
              disabled={mutation.isPending}
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            <Field.Text
              name="body"
              label="ข้อความ"
              required
              multiline
              minRows={4}
              disabled={mutation.isPending}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
            />
            {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button color="inherit" disabled={mutation.isPending} onClick={onClose}>
                ยกเลิก
              </Button>
              <Button
                type="submit"
                variant="contained"
                loading={mutation.isPending}
                disabled={recipients.isLoading || !!recipients.error}
              >
                ส่งแจ้งเตือน
              </Button>
            </Box>
          </Box>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
