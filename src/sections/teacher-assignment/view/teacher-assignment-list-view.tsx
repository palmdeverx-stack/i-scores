'use client';

import type { TeacherAssignment } from '../teacher-assignment-actions';

import { useMemo, useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CardActionArea from '@mui/material/CardActionArea';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { TeacherAssignmentFormDialog } from '../components/teacher-assignment-form-dialog';
import { listTeacherAssignments, deleteTeacherAssignment } from '../teacher-assignment-actions';

// ----------------------------------------------------------------------

const summaryItems = [
  {
    key: 'classes',
    label: 'ชั้นเรียนทั้งหมด',
    icon: 'solar:notebook-bold-duotone',
    color: 'success.main',
    bgcolor: 'success.lighter',
  },
  {
    key: 'subjects',
    label: 'รายวิชา',
    icon: 'solar:notes-bold-duotone',
    color: 'primary.main',
    bgcolor: 'primary.lighter',
  },
  {
    key: 'classrooms',
    label: 'ห้องเรียน',
    icon: 'solar:users-group-rounded-bold-duotone',
    color: 'warning.main',
    bgcolor: 'warning.lighter',
  },
  {
    key: 'semesters',
    label: 'ภาคเรียน',
    icon: 'solar:calendar-date-bold',
    color: 'secondary.dark',
    bgcolor: 'secondary.lighter',
  },
] as const;

export function TeacherAssignmentListView() {
  const { user } = useAuthContext();
  const isTeacher = user?.role === 'teacher';
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<TeacherAssignment | null>(null);
  const [deletingRow, setDeletingRow] = useState<TeacherAssignment | null>(null);
  const queryClient = useQueryClient();

  const detailPath = (id: string) =>
    isTeacher ? paths.teacher.assignmentDetail(id) : paths.admin.teacherAssignment.detail(id);

  const {
    data: rows = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['teacher-assignments'],
    queryFn: listTeacherAssignments,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTeacherAssignment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] });
      setDeletingRow(null);
    },
  });

  const openCreateDialog = () => {
    setEditingRow(null);
    setDialogOpen(true);
  };

  const openEditDialog = (row: TeacherAssignment) => {
    setEditingRow(row);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRow(null);
  };

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('th');

    if (!keyword) return rows;

    return rows.filter((row) => {
      const teacherName = `${row.teacher.first_name ?? ''} ${row.teacher.last_name ?? ''}`;
      const searchableText = [
        teacherName,
        row.teacher.username,
        row.subject.name,
        row.classroom.name,
        row.semester.name,
      ]
        .join(' ')
        .toLocaleLowerCase('th');

      return searchableText.includes(keyword);
    });
  }, [rows, search]);

  const summary = useMemo(
    () => ({
      classes: rows.length,
      subjects: new Set(rows.map((row) => row.subject.id)).size,
      classrooms: new Set(rows.map((row) => row.classroom.id)).size,
      semesters: new Set(rows.map((row) => row.semester.id)).size,
    }),
    [rows]
  );

  return (
    <Container maxWidth="lg" sx={{ pb: 5 }}>
      <Card
        sx={{
          mb: 4,
          p: { xs: 3, sm: 4 },
          color: 'common.white',
          overflow: 'hidden',
          position: 'relative',
          background: (theme) =>
            `linear-gradient(135deg, ${theme.vars.palette.primary.darker} 0%, ${theme.vars.palette.primary.main} 100%)`,
          '&::after': {
            width: 240,
            height: 240,
            content: '""',
            borderRadius: '50%',
            position: 'absolute',
            right: { xs: -150, sm: -80 },
            bottom: -150,
            backgroundColor: (theme) => varAlpha(theme.vars.palette.common.whiteChannel, 0.08),
          },
        }}
      >
        <Box
          sx={{
            gap: 3,
            zIndex: 1,
            display: 'flex',
            position: 'relative',
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography
              component="p"
              variant="overline"
              sx={{ mb: 0.5, opacity: 0.8, letterSpacing: 1.2 }}
            >
              พื้นที่จัดการชั้นเรียน
            </Typography>
            <Typography component="h1" variant="h3" sx={{ mb: 1 }}>
              {isTeacher ? 'รายวิชาที่รับผิดชอบ' : 'ครูประจำวิชา'}
            </Typography>
            <Typography
              sx={(theme) => ({
                maxWidth: 600,
                color: varAlpha(theme.vars.palette.common.whiteChannel, 0.76),
              })}
            >
              {isTeacher
                ? 'เลือกวิชาและห้องเรียน เพื่อสร้างงาน ตรวจสอบรายชื่อนักเรียน และบันทึกคะแนน'
                : 'จัดการครูผู้สอน รายวิชา และห้องเรียนที่ได้รับมอบหมาย'}
            </Typography>
          </Box>

          <Button
            variant="contained"
            onClick={openCreateDialog}
            startIcon={<Iconify icon="mingcute:add-line" />}
            sx={{
              flexShrink: 0,
              color: 'primary.darker',
              bgcolor: 'common.white',
              '&:hover': { bgcolor: 'grey.200' },
            }}
          >
            {isTeacher ? 'เพิ่มรายวิชาที่สอน' : 'เพิ่มครูประจำวิชา'}
          </Button>
        </Box>
      </Card>

      <Box
        sx={{
          mb: 4,
          gap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        }}
      >
        {summaryItems.map((item) => (
          <Card key={item.key} variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  display: 'grid',
                  borderRadius: 1.5,
                  placeItems: 'center',
                  color: item.color,
                  bgcolor: item.bgcolor,
                }}
              >
                <Iconify icon={item.icon} width={25} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h4" sx={{ lineHeight: 1.1 }}>
                  {isLoading ? <Skeleton width={32} /> : summary[item.key]}
                </Typography>
                <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
                  {item.label}
                </Typography>
              </Box>
            </Box>
          </Card>
        ))}
      </Box>

      <Box
        sx={{
          mb: 3,
          gap: 2,
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography component="h2" variant="h5">
            วิชาของฉัน
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {isLoading ? 'กำลังโหลดข้อมูล...' : `พบ ${filteredRows.length} วิชา`}
          </Typography>
        </Box>

        <TextField
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ค้นหารายวิชา ห้องเรียน หรือภาคเรียน"
          aria-label="ค้นหาชั้นเรียน"
          sx={{ width: { xs: 1, sm: 360 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" width={21} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')} aria-label="ล้างคำค้นหา">
                    <Iconify icon="mingcute:close-line" width={19} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
      </Box>

      {isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              ลองอีกครั้ง
            </Button>
          }
          sx={{ mb: 3 }}
        >
          ไม่สามารถโหลดข้อมูลชั้นเรียนได้ กรุณาลองใหม่อีกครั้ง
        </Alert>
      )}

      {isLoading ? (
        <Box
          aria-label="กำลังโหลดชั้นเรียน"
          sx={{
            gap: 2.5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          }}
        >
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} variant="rounded" height={235} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            gap: 2.5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          }}
        >
          {filteredRows.map((row) => {
            const teacherName =
              `${row.teacher.first_name ?? ''} ${row.teacher.last_name ?? ''}`.trim() ||
              row.teacher.username;

            return (
              <Card
                key={row.id}
                variant="outlined"
                sx={{
                  height: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  transition:
                    'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: 'primary.main',
                    boxShadow: (theme) => theme.customShadows.card,
                  },
                  '&:focus-within': { outline: '3px solid', outlineColor: 'primary.lighter' },
                }}
              >
                <CardActionArea
                  component={RouterLink}
                  href={detailPath(row.id)}
                  aria-label={`เปิดรายวิชา ${row.subject.name} ห้อง ${row.classroom.name}`}
                  sx={{ width: 1, flex: 1, p: 3, display: 'flex', alignItems: 'stretch' }}
                >
                  <Box sx={{ width: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'flex-start' }}>
                      <Avatar
                        src={row.subject.image_url ?? undefined}
                        variant="rounded"
                        sx={{
                          width: 48,
                          height: 48,
                          mr: 2,
                          flexShrink: 0,
                          borderRadius: 1.75,
                          color: 'primary.main',
                          bgcolor: 'primary.lighter',
                        }}
                      >
                        <Iconify icon="solar:notebook-bold-duotone" width={28} />
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" sx={{ lineHeight: 1.35 }}>
                          {row.subject.name}
                        </Typography>
                        {!isTeacher && (
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{ mt: 0.5, color: 'text.secondary' }}
                          >
                            {teacherName}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ gap: 1, mb: 3, display: 'flex', flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        icon={<Iconify icon="solar:users-group-rounded-bold" />}
                        label={`ห้อง ${row.classroom.name}`}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        icon={<Iconify icon="mingcute:calendar-month-line" />}
                        label={row.semester.name}
                      />
                    </Box>

                    <Box
                      sx={{
                        pt: 2,
                        mt: 'auto',
                        display: 'flex',
                        color: 'primary.main',
                        alignItems: 'center',
                        borderTop: '1px dashed',
                        borderColor: 'divider',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Typography variant="subtitle2">จัดการงานและคะแนน</Typography>
                      <Iconify icon="eva:arrow-ios-forward-fill" width={22} />
                    </Box>
                  </Box>
                </CardActionArea>
                <Box
                  sx={{
                    gap: 1,
                    px: 2,
                    py: 1.25,
                    width: 1,
                    display: 'flex',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    justifyContent: 'flex-end',
                  }}
                >
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => openEditDialog(row)}
                    startIcon={<Iconify icon="solar:pen-bold" />}
                  >
                    แก้ไข
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => {
                      deleteMutation.reset();
                      setDeletingRow(row);
                    }}
                    startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                  >
                    ลบ
                  </Button>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}

      {!isLoading && !isError && !filteredRows.length && (
        <Card variant="outlined" sx={{ py: 7, px: 3, textAlign: 'center' }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              mx: 'auto',
              mb: 2.5,
              display: 'grid',
              borderRadius: '50%',
              color: 'text.secondary',
              placeItems: 'center',
              bgcolor: 'background.neutral',
            }}
          >
            <Iconify icon={search ? 'eva:search-fill' : 'solar:notebook-bold-duotone'} width={36} />
          </Box>
          <Typography variant="h6">
            {search ? 'ไม่พบชั้นเรียนที่ค้นหา' : 'ยังไม่มีชั้นเรียนที่ได้รับมอบหมาย'}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            {search
              ? 'ลองเปลี่ยนคำค้นหา หรือล้างคำค้นหาเพื่อดูทั้งหมด'
              : isTeacher
                ? 'เริ่มเพิ่มวิชา ห้องเรียน และภาคเรียนที่คุณรับผิดชอบ'
                : 'เมื่อได้รับมอบหมาย รายวิชาจะแสดงที่นี่'}
          </Typography>
          {search ? (
            <Button sx={{ mt: 2.5 }} onClick={() => setSearch('')}>
              ล้างคำค้นหา
            </Button>
          ) : (
            isTeacher && (
              <Button
                variant="contained"
                sx={{ mt: 2.5 }}
                onClick={openCreateDialog}
                startIcon={<Iconify icon="mingcute:add-line" />}
              >
                เพิ่มรายวิชาที่สอน
              </Button>
            )
          )}
        </Card>
      )}

      <TeacherAssignmentFormDialog
        open={dialogOpen}
        editingRow={editingRow}
        onClose={closeDialog}
      />

      <Dialog
        open={!!deletingRow}
        onClose={() => !deleteMutation.isPending && setDeletingRow(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>ยืนยันการลบรายวิชาที่รับผิดชอบ</DialogTitle>
        <DialogContent>
          {deleteMutation.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteMutation.error.message}
            </Alert>
          )}
          <Alert severity="warning" sx={{ mb: 2 }}>
            งาน คะแนน และตารางสอนที่อยู่ภายใต้รายการนี้จะถูกลบไปด้วย
          </Alert>
          <Typography variant="body2">
            ต้องการลบวิชา <strong>{deletingRow?.subject.name}</strong> ห้อง{' '}
            <strong>{deletingRow?.classroom.name}</strong> หรือไม่?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            disabled={deleteMutation.isPending}
            onClick={() => setDeletingRow(null)}
          >
            ยกเลิก
          </Button>
          <Button
            color="error"
            variant="contained"
            loading={deleteMutation.isPending}
            onClick={() => deletingRow && deleteMutation.mutate(deletingRow.id)}
          >
            ยืนยันการลบ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
