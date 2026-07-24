'use client';

import type {
  GuardianInput,
  StudentGuardian,
  GuardianLineInvitation,
} from '../student-guardian-actions';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/iconify';

import {
  unlinkGuardianLine,
  listStudentGuardians,
  createStudentGuardian,
  updateStudentGuardian,
  deleteStudentGuardian,
  createGuardianLineInvitation,
} from '../student-guardian-actions';

// ----------------------------------------------------------------------

type Student = {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
};

type Props = {
  open: boolean;
  student: Student | null;
  teacherAssignmentId?: string;
  onClose: () => void;
};

const EMPTY_FORM: GuardianInput = {
  fullName: '',
  relationship: '',
  phone: '',
  email: '',
  occupation: '',
  address: '',
  notes: '',
  isPrimary: false,
};

export function StudentGuardiansDialog({ open, student, teacherAssignmentId, onClose }: Props) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudentGuardian | null>(null);
  const [form, setForm] = useState<GuardianInput>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<StudentGuardian | null>(null);
  const [lineTarget, setLineTarget] = useState<StudentGuardian | null>(null);
  const [lineInvitation, setLineInvitation] = useState<GuardianLineInvitation | null>(null);
  const [lineQrImage, setLineQrImage] = useState('');
  const assignmentScope = teacherAssignmentId ?? null;
  const queryKey = ['student-guardians', assignmentScope ?? 'admin', student?.id];

  const {
    data = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey,
    queryFn: () => listStudentGuardians(assignmentScope, student!.id),
    enabled: open && !!student,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? updateStudentGuardian(assignmentScope, student!.id, editing.id, form)
        : createStudentGuardian(assignmentScope, student!.id, form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      setFormOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (guardianId: string) =>
      deleteStudentGuardian(assignmentScope, student!.id, guardianId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      setDeleteTarget(null);
    },
  });

  const lineInviteMutation = useMutation({
    mutationFn: (guardianId: string) => createGuardianLineInvitation(guardianId),
    onSuccess: (invitation) => {
      setLineQrImage('');
      setLineInvitation(invitation);
    },
  });
  const unlinkLineMutation = useMutation({
    mutationFn: (guardianId: string) => unlinkGuardianLine(guardianId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      setLineTarget(null);
      setLineInvitation(null);
    },
  });

  useEffect(() => {
    const payload = lineInvitation?.lineChatUrl;
    if (!payload) return undefined;
    let active = true;
    void import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(payload, {
          width: 520,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#111827', light: '#FFFFFF' },
        })
      )
      .then((image) => {
        if (active) setLineQrImage(image);
      })
      .catch(() => {
        if (active) setLineQrImage('');
      });
    return () => {
      active = false;
    };
  }, [lineInvitation?.lineChatUrl]);

  const studentName = student
    ? `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || student.username
    : '';

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, isPrimary: data.length === 0 });
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (guardian: StudentGuardian) => {
    setEditing(guardian);
    setForm({
      fullName: guardian.full_name,
      relationship: guardian.relationship,
      phone: guardian.phone,
      email: guardian.email ?? '',
      occupation: guardian.occupation ?? '',
      address: guardian.address ?? '',
      notes: guardian.notes ?? '',
      isPrimary: guardian.is_primary,
    });
    setFormError('');
    setFormOpen(true);
  };

  const submit = () => {
    if (!form.fullName.trim() || !form.relationship.trim() || !form.phone.trim()) {
      setFormError('กรุณากรอกชื่อ ความสัมพันธ์ และเบอร์โทรศัพท์');
      return;
    }
    setFormError('');
    saveMutation.mutate();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pb: 1 }}>
          ข้อมูลผู้ปกครอง
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {studentName} · @{student?.username}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {isError && <Alert severity="error">ไม่สามารถโหลดข้อมูลผู้ปกครองได้</Alert>}
          {isLoading && <Typography sx={{ py: 4, textAlign: 'center' }}>กำลังโหลด...</Typography>}
          {!isLoading && !isError && !data.length && (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <Iconify
                icon="solar:users-group-rounded-bold"
                width={48}
                sx={{ color: 'text.disabled' }}
              />
              <Typography variant="subtitle1" sx={{ mt: 1 }}>
                ยังไม่มีข้อมูลผู้ปกครอง
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                เพิ่มผู้ติดต่อเพื่อให้ครูสามารถประสานงานได้สะดวก
              </Typography>
            </Box>
          )}
          <Box sx={{ gap: 1.5, display: 'grid' }}>
            {data.map((guardian) => (
              <Card key={guardian.id} variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'flex-start' }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ gap: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography variant="subtitle1">{guardian.full_name}</Typography>
                      <Chip size="small" variant="soft" label={guardian.relationship} />
                      {guardian.is_primary && (
                        <Chip size="small" color="primary" label="ผู้ติดต่อหลัก" />
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ mt: 0.75 }}>
                      โทร {guardian.phone}
                      {guardian.email ? ` · ${guardian.email}` : ''}
                    </Typography>
                    {guardian.occupation && (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        อาชีพ {guardian.occupation}
                      </Typography>
                    )}
                    {guardian.address && (
                      <Typography
                        variant="caption"
                        sx={{ display: 'block', color: 'text.secondary' }}
                      >
                        ที่อยู่ {guardian.address}
                      </Typography>
                    )}
                    {guardian.notes && (
                      <Typography
                        variant="caption"
                        sx={{ display: 'block', color: 'text.secondary' }}
                      >
                        หมายเหตุ {guardian.notes}
                      </Typography>
                    )}
                    <Box sx={{ gap: 1, mt: 1.25, display: 'flex', alignItems: 'center' }}>
                      <Chip
                        size="small"
                        color={guardian.line_linked_at ? 'success' : 'default'}
                        icon={
                          <Iconify
                            icon={
                              guardian.line_linked_at
                                ? 'solar:check-circle-bold'
                                : 'solar:chat-round-dots-bold'
                            }
                          />
                        }
                        label={
                          guardian.line_linked_at
                            ? `LINE: ${guardian.line_display_name ?? 'เชื่อมแล้ว'}`
                            : 'ยังไม่เชื่อม LINE'
                        }
                      />
                      <Button
                        size="small"
                        color={guardian.line_linked_at ? 'error' : 'success'}
                        onClick={() => {
                          setLineTarget(guardian);
                          setLineInvitation(null);
                          setLineQrImage('');
                          if (!guardian.line_linked_at) lineInviteMutation.mutate(guardian.id);
                        }}
                      >
                        {guardian.line_linked_at ? 'ยกเลิกการเชื่อม' : 'สร้างรหัสเชื่อม'}
                      </Button>
                    </Box>
                  </Box>
                  <IconButton aria-label="แก้ไขข้อมูลผู้ปกครอง" onClick={() => openEdit(guardian)}>
                    <Iconify icon="solar:pen-bold" />
                  </IconButton>
                  <IconButton
                    color="error"
                    aria-label="ลบข้อมูลผู้ปกครอง"
                    onClick={() => setDeleteTarget(guardian)}
                  >
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </Box>
              </Card>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={onClose}>
            ปิด
          </Button>
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={openCreate}
          >
            เพิ่มผู้ปกครอง
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'แก้ไขข้อมูลผู้ปกครอง' : 'เพิ่มข้อมูลผู้ปกครอง'}</DialogTitle>
        <DialogContent>
          {(formError || saveMutation.error) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError || saveMutation.error?.message}
            </Alert>
          )}
          <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField
              required
              label="ชื่อ-นามสกุล"
              value={form.fullName}
              onChange={(e) => setForm((v) => ({ ...v, fullName: e.target.value }))}
              sx={{ gridColumn: { sm: '1 / -1' } }}
            />
            <TextField
              required
              label="ความสัมพันธ์"
              placeholder="เช่น บิดา มารดา"
              value={form.relationship}
              onChange={(e) => setForm((v) => ({ ...v, relationship: e.target.value }))}
            />
            <TextField
              required
              label="เบอร์โทรศัพท์"
              value={form.phone}
              onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))}
            />
            <TextField
              label="อีเมล"
              type="email"
              value={form.email}
              onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
            />
            <TextField
              label="อาชีพ"
              value={form.occupation}
              onChange={(e) => setForm((v) => ({ ...v, occupation: e.target.value }))}
            />
            <TextField
              label="ที่อยู่"
              multiline
              minRows={2}
              value={form.address}
              onChange={(e) => setForm((v) => ({ ...v, address: e.target.value }))}
              sx={{ gridColumn: { sm: '1 / -1' } }}
            />
            <TextField
              label="หมายเหตุ"
              multiline
              minRows={2}
              value={form.notes}
              onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))}
              sx={{ gridColumn: { sm: '1 / -1' } }}
            />
          </Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={form.isPrimary}
                onChange={(e) => setForm((v) => ({ ...v, isPrimary: e.target.checked }))}
              />
            }
            label="กำหนดเป็นผู้ติดต่อหลัก"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setFormOpen(false)}>
            ยกเลิก
          </Button>
          <Button variant="contained" loading={saveMutation.isPending} onClick={submit}>
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>ลบข้อมูลผู้ปกครอง?</DialogTitle>
        <DialogContent>
          <Typography>ต้องการลบข้อมูลของ {deleteTarget?.full_name} ใช่หรือไม่</Typography>
          {deleteMutation.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteMutation.error.message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDeleteTarget(null)}>
            ยกเลิก
          </Button>
          <Button
            color="error"
            variant="contained"
            loading={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            ลบข้อมูล
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!lineTarget}
        onClose={() => {
          setLineTarget(null);
          setLineInvitation(null);
          setLineQrImage('');
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {lineTarget?.line_linked_at ? 'ยกเลิกการเชื่อม LINE?' : 'เชื่อม LINE ผู้ปกครอง'}
        </DialogTitle>
        <DialogContent>
          {lineInviteMutation.isPending && (
            <Typography sx={{ py: 3, textAlign: 'center' }}>กำลังสร้างรหัส...</Typography>
          )}
          {(lineInviteMutation.error || unlinkLineMutation.error) && (
            <Alert severity="error">
              {lineInviteMutation.error?.message ?? unlinkLineMutation.error?.message}
            </Alert>
          )}
          {lineTarget?.line_linked_at ? (
            <Typography>
              เมื่อตัดการเชื่อม {lineTarget.full_name} จะไม่ได้รับการแจ้งเตือนผ่าน LINE
            </Typography>
          ) : (
            lineInvitation && (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  ให้ผู้ปกครองสแกน QR เปิดแชต LINE OA แล้วกดส่งข้อความภายใน 24 ชั่วโมง
                </Typography>
                {lineInvitation.lineChatUrl ? (
                  <Box
                    sx={{
                      my: 2,
                      mx: 'auto',
                      p: 1,
                      width: 240,
                      height: 240,
                      display: 'grid',
                      borderRadius: 2,
                      placeItems: 'center',
                      bgcolor: 'common.white',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {lineQrImage ? (
                      <Box
                        component="img"
                        src={lineQrImage}
                        alt={`QR เชื่อม LINE ของ ${lineTarget?.full_name ?? 'ผู้ปกครอง'}`}
                        sx={{ width: 1, height: 1 }}
                      />
                    ) : (
                      <CircularProgress color="success" />
                    )}
                  </Box>
                ) : (
                  <Alert severity="warning" sx={{ mt: 2, textAlign: 'left' }}>
                    กรุณากรอก LINE OA Basic ID ในหน้าแจ้งเตือน LINE เพื่อสร้าง QR
                  </Alert>
                )}
                <Typography
                  variant="h6"
                  sx={{
                    my: 1.5,
                    p: 1.5,
                    borderRadius: 1.5,
                    letterSpacing: 2,
                    bgcolor: 'background.neutral',
                  }}
                >
                  {lineInvitation.message}
                </Typography>
                <Box sx={{ gap: 1, display: 'flex', justifyContent: 'center' }}>
                  {lineQrImage && (
                    <Button
                      color="success"
                      variant="contained"
                      startIcon={<Iconify icon="solar:download-bold" />}
                      onClick={() => {
                        const anchor = document.createElement('a');
                        anchor.href = lineQrImage;
                        anchor.download = `line-link-${lineTarget?.full_name ?? 'guardian'}.png`;
                        anchor.click();
                      }}
                    >
                      ดาวน์โหลด QR
                    </Button>
                  )}
                  {lineInvitation.addFriendUrl && (
                    <Button
                      color="success"
                      variant="outlined"
                      onClick={() => window.open(lineInvitation.addFriendUrl!, '_blank')}
                    >
                      เพิ่มเพื่อน LINE OA
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    onClick={() => navigator.clipboard.writeText(lineInvitation.message)}
                  >
                    คัดลอกข้อความ
                  </Button>
                </Box>
              </Box>
            )
          )}
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() => {
              setLineTarget(null);
              setLineInvitation(null);
              setLineQrImage('');
            }}
          >
            ปิด
          </Button>
          {lineTarget?.line_linked_at && (
            <Button
              color="error"
              variant="contained"
              loading={unlinkLineMutation.isPending}
              onClick={() => unlinkLineMutation.mutate(lineTarget.id)}
            >
              ยืนยันยกเลิก
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
