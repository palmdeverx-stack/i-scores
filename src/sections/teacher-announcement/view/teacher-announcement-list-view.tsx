'use client';

import type { TeacherAnnouncement } from '../teacher-announcement-actions';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Skeleton from '@mui/material/Skeleton';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { Iconify } from 'src/components/iconify';

import { TeacherAnnouncementFormDialog } from '../components/teacher-announcement-form-dialog';
import {
  getTeacherAnnouncements,
  deleteTeacherAnnouncement,
} from '../teacher-announcement-actions';

// ----------------------------------------------------------------------

const typeConfig = {
  general: { label: 'ทั่วไป', color: 'info' as const, icon: 'solar:bell-bing-bold' as const },
  holiday: {
    label: 'วันหยุด',
    color: 'success' as const,
    icon: 'solar:calendar-date-bold' as const,
  },
  exam: {
    label: 'วันสอบ',
    color: 'warning' as const,
    icon: 'solar:file-check-bold-duotone' as const,
  },
};

const priorityConfig = {
  normal: { label: 'ปกติ', color: 'default' as const },
  important: { label: 'สำคัญ', color: 'warning' as const },
  urgent: { label: 'เร่งด่วน', color: 'error' as const },
};

export function TeacherAnnouncementListView() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherAnnouncement | null>(null);
  const [deleting, setDeleting] = useState<TeacherAnnouncement | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['teacher-announcements'],
    queryFn: getTeacherAnnouncements,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteTeacherAnnouncement,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['teacher-announcements'] });
      await queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      setDeleting(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (announcement: TeacherAnnouncement) => {
    setEditing(announcement);
    setDialogOpen(true);
  };

  return (
    <Container maxWidth="lg" sx={{ pb: 5 }}>
      <Box
        sx={{
          mb: 3,
          gap: 2,
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <Box>
          <Typography component="h1" variant="h3">
            ประกาศถึงนักเรียน
          </Typography>
          <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
            แจ้งข่าว วันหยุด และวันสอบไปยังห้องเรียนที่คุณรับผิดชอบ
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={openCreate}
        >
          สร้างประกาศ
        </Button>
      </Box>

      {isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={() => refetch()}>
              ลองอีกครั้ง
            </Button>
          }
        >
          ไม่สามารถโหลดประกาศได้
        </Alert>
      )}
      {deleteMutation.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {deleteMutation.error.message}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ gap: 2, display: 'grid' }}>
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} variant="rounded" height={170} />
          ))}
        </Box>
      ) : data?.announcements.length ? (
        <Box sx={{ gap: 2, display: 'grid' }}>
          {data.announcements.map((announcement) => {
            const type = typeConfig[announcement.announcement_type];
            const priority = priorityConfig[announcement.priority];
            return (
              <Card
                key={announcement.id}
                variant="outlined"
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderLeft: '5px solid',
                  borderLeftColor: `${type.color}.main`,
                }}
              >
                <Box sx={{ gap: 2, display: 'flex', alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      p: 1.25,
                      display: { xs: 'none', sm: 'flex' },
                      borderRadius: 2,
                      color: `${type.color}.main`,
                      bgcolor: `${type.color}.lighter`,
                    }}
                  >
                    <Iconify icon={type.icon} width={26} />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
                      <Typography component="h2" variant="h6">
                        {announcement.title}
                      </Typography>
                      <Chip size="small" label={type.label} color={type.color} variant="soft" />
                      <Chip
                        size="small"
                        label={priority.label}
                        color={priority.color}
                        variant="outlined"
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{ mt: 1, color: 'text.secondary', whiteSpace: 'pre-line' }}
                    >
                      {announcement.content}
                    </Typography>
                    <Box sx={{ gap: 0.75, mt: 2, display: 'flex', flexWrap: 'wrap' }}>
                      {announcement.targets.map((target) => (
                        <Chip
                          key={target.classroom_id}
                          size="small"
                          icon={<Iconify icon="solar:users-group-rounded-bold" />}
                          label={target.classroom?.name ?? 'ห้องเรียน'}
                        />
                      ))}
                    </Box>
                    {(announcement.event_start || announcement.event_end) && (
                      <Typography
                        variant="caption"
                        sx={{ mt: 1.5, display: 'block', color: 'text.secondary' }}
                      >
                        <Iconify
                          icon="solar:calendar-date-bold"
                          width={16}
                          sx={{ mr: 0.5, verticalAlign: 'text-bottom' }}
                        />
                        {announcement.event_start
                          ? formatDate(announcement.event_start)
                          : 'ไม่ระบุ'}{' '}
                        – {announcement.event_end ? formatDate(announcement.event_end) : 'ไม่ระบุ'}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex' }}>
                    <IconButton
                      aria-label={`แก้ไข ${announcement.title}`}
                      onClick={() => openEdit(announcement)}
                    >
                      <Iconify icon="solar:pen-bold" />
                    </IconButton>
                    <IconButton
                      color="error"
                      aria-label={`ลบ ${announcement.title}`}
                      onClick={() => setDeleting(announcement)}
                    >
                      <Iconify icon="solar:trash-bin-trash-bold" />
                    </IconButton>
                  </Box>
                </Box>
              </Card>
            );
          })}
        </Box>
      ) : !isError ? (
        <Card variant="outlined" sx={{ py: 8, px: 3, textAlign: 'center' }}>
          <Iconify icon="solar:bell-off-bold" width={56} sx={{ color: 'text.disabled' }} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            ยังไม่มีประกาศ
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            สร้างประกาศแรกเพื่อแจ้งข่าวให้นักเรียนในห้องของคุณ
          </Typography>
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={openCreate}
            sx={{ mt: 2.5 }}
          >
            สร้างประกาศ
          </Button>
        </Card>
      ) : null}

      <TeacherAnnouncementFormDialog
        open={dialogOpen}
        announcement={editing}
        classrooms={data?.classrooms ?? []}
        onClose={() => setDialogOpen(false)}
      />

      <Dialog
        open={!!deleting}
        onClose={() => !deleteMutation.isPending && setDeleting(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>ยืนยันการลบประกาศ</DialogTitle>
        <DialogContent>
          <Typography>
            ต้องการลบ “{deleting?.title}” ใช่หรือไม่? นักเรียนจะไม่เห็นประกาศนี้อีก
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() => setDeleting(null)}
            disabled={deleteMutation.isPending}
          >
            ยกเลิก
          </Button>
          <Button
            color="error"
            variant="contained"
            loading={deleteMutation.isPending}
            onClick={() => deleting && deleteMutation.mutate(deleting.id)}
          >
            ลบประกาศ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
