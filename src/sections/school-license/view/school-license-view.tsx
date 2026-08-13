'use client';

import type { SchoolLicenseData } from '../school-license-actions';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { fDate } from 'src/utils/format-time';

import { SCHOOL_FEATURES } from 'src/lib/school-subscription-config';

import { toast } from 'src/components/snackbar';
import { RemixIcon } from 'src/components/remix-icon';

import { inviteMarketplaceUser } from 'src/sections/user/user-actions';

import {
  resendInvitation,
  revokeInvitation,
  getSchoolLicenses,
  assignTeacherLicense,
  revokeTeacherLicense,
  removeMarketplaceMember,
} from '../school-license-actions';

// ----------------------------------------------------------------------

type LicenseRow = SchoolLicenseData['licenses'][number];

const FEATURE_LABELS = new Map<string, string>(
  SCHOOL_FEATURES.map((feature) => [feature.key, feature.label])
);

const MEMBER_ROLE_LABELS: Record<string, string> = {
  owner: 'เจ้าของบัญชีโรงเรียน',
  admin: 'ผู้ดูแลระบบ E-KRU',
  member: 'ผู้ใช้งาน',
};

function licenseStatus(license: LicenseRow) {
  if (license.status === 'revoked') return 'ถูกยกเลิก';
  if (license.starts_at > new Date().toISOString()) return 'ยังไม่ถึงวันเริ่มใช้';
  if (!license.is_current) return 'หมดอายุแล้ว';
  return 'ใช้งานได้';
}

function teacherName(teacher: SchoolLicenseData['teachers'][number]) {
  return (
    `${teacher.name_prefix ?? ''}${teacher.first_name ?? ''} ${teacher.last_name ?? ''}`.trim() ||
    teacher.username
  );
}

function memberDisplayName(
  member: SchoolLicenseData['members'][number],
  teachers: SchoolLicenseData['teachers']
) {
  const matchedTeacher = member.user?.email
    ? teachers.find((teacher) => teacher.email?.toLowerCase() === member.user!.email.toLowerCase())
    : undefined;
  if (matchedTeacher) return teacherName(matchedTeacher);

  return (
    [member.user?.first_name, member.user?.last_name].filter(Boolean).join(' ') ||
    member.user?.username ||
    '-'
  );
}

export function SchoolLicenseView() {
  const queryClient = useQueryClient();
  const [selectedLicense, setSelectedLicense] = useState<LicenseRow | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const licenseQuery = useQuery({
    queryKey: ['school-marketplace-licenses'],
    queryFn: getSchoolLicenses,
  });
  const data = licenseQuery.data;

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['school-marketplace-licenses'] });

  const assignmentMutation = useMutation({
    mutationFn: async ({
      licenseId,
      teacherId,
      assignmentId,
    }: {
      licenseId: string;
      teacherId: string;
      assignmentId?: string;
    }) =>
      assignmentId
        ? revokeTeacherLicense(assignmentId)
        : assignTeacherLicense({ licenseId, teacherId }),
    onSuccess: async (_result, variables) => {
      toast.success(
        variables.assignmentId ? 'ถอนสิทธิ์ใช้งานจากครูแล้ว' : 'มอบสิทธิ์ใช้งานให้ครูแล้ว'
      );
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: removeMarketplaceMember,
    onSuccess: async () => {
      toast.success('นำผู้ใช้ออกจากระบบ E-KRU ของโรงเรียนแล้ว');
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const revokeInvitationMutation = useMutation({
    mutationFn: revokeInvitation,
    onSuccess: async () => {
      toast.success('ยกเลิกคำเชิญแล้ว');
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resendInvitationMutation = useMutation({
    mutationFn: resendInvitation,
    onSuccess: async ({ notified }) => {
      toast.success(notified ? 'แจ้งเตือนซ้ำแล้ว และต่ออายุคำเชิญแล้ว' : 'ต่ออายุคำเชิญแล้ว');
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const inviteMutation = useMutation({
    mutationFn: inviteMarketplaceUser,
    onSuccess: async ({ marketplaceUser }) => {
      toast.success(
        marketplaceUser.notified
          ? `แจ้งเตือน ${marketplaceUser.email} แล้ว รอครูกดยอมรับ`
          : `สร้างคำเชิญสำหรับ ${marketplaceUser.email} แล้ว จะแจ้งเตือนอัตโนมัติเมื่อครูเข้าสู่ระบบครั้งแรก`
      );
      setInviteOpen(false);
      setInviteEmail('');
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const currentLicenses = data?.licenses.filter((license) => license.is_current) ?? [];
  const totalSeats = currentLicenses
    .filter((license) => license.license_scope === 'teacher')
    .reduce((sum, license) => sum + license.seat_count, 0);
  const usedSeats = currentLicenses
    .filter((license) => license.license_scope === 'teacher')
    .reduce((sum, license) => sum + license.used_seats, 0);
  const pendingInvitationsList =
    data?.invitations.filter((invitation) => invitation.invitation_status === 'pending') ?? [];
  const pendingInvitations = pendingInvitationsList.length;
  const currentSelectedLicense =
    data?.licenses.find((license) => license.id === selectedLicense?.id) ?? selectedLicense;

  return (
    <Container maxWidth={false} sx={{ pb: 5 }}>
      <Box
        sx={{
          mb: 4,
          gap: 2,
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography component="h1" variant="h3">
            ระบบ E-KRU ของโรงเรียน
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            จัดการระบบ E-KRU ที่ซื้อผ่าน Marketplace และกำหนดครูที่เข้าใช้งานได้
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<RemixIcon icon="solar:letter-bold-duotone" />}
          onClick={() => setInviteOpen(true)}
        >
          เชิญครูใช้ระบบ E-KRU
        </Button>
      </Box>

      {licenseQuery.isLoading && <LinearProgress sx={{ mb: 3 }} />}
      {licenseQuery.isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => licenseQuery.refetch()}>
              ลองอีกครั้ง
            </Button>
          }
          sx={{ mb: 3 }}
        >
          {licenseQuery.error.message}
        </Alert>
      )}

      <Box
        sx={{
          mb: 3,
          gap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        }}
      >
        {[
          {
            label: 'ระบบที่ใช้งานได้',
            value: currentLicenses.length,
            icon: 'solar:verified-check-bold-duotone',
          },
          {
            label: 'ครูที่ได้รับสิทธิ์',
            value: totalSeats ? `${usedSeats} จาก ${totalSeats}` : 'ไม่มีแบบรายครู',
            icon: 'solar:users-group-rounded-bold-duotone',
          },
          {
            label: 'คำเชิญรอตอบรับ',
            value: pendingInvitations,
            icon: 'solar:letter-opened-bold-duotone',
          },
        ].map((item) => (
          <Card key={item.label} variant="outlined" sx={{ p: 3 }}>
            <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
              <RemixIcon icon={item.icon} width={36} />
              <Box>
                <Typography variant="h4">{item.value}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {item.label}
                </Typography>
              </Box>
            </Box>
          </Card>
        ))}
      </Box>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <Box sx={{ px: 3, py: 2.5 }}>
          <Typography variant="h6">ระบบ E-KRU ที่เปิดใช้งาน</Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
            ระบบที่โรงเรียนซื้อผ่าน Marketplace พร้อมจำนวนครูที่มีสิทธิ์เข้าใช้งาน
          </Typography>
        </Box>
        <TableContainer>
          <Table sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell>ชื่อระบบ E-KRU</TableCell>
                <TableCell>ผู้ที่ใช้ได้</TableCell>
                <TableCell>ระบบและเมนูที่ได้รับ</TableCell>
                <TableCell>วันที่ใช้งาน</TableCell>
                <TableCell>จำนวนผู้ใช้</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell align="right">การจัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!data?.licenses.length && !licenseQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 6, textAlign: 'center' }}>
                    โรงเรียนยังไม่มีระบบ E-KRU ที่ซื้อผ่าน Marketplace
                  </TableCell>
                </TableRow>
              )}
              {data?.licenses.map((license) => (
                <TableRow key={license.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {license.product?.title ?? 'ระบบ E-KRU'}
                    </Typography>
                    {license.product?.title_en && (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {license.product.title_en}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={
                        license.license_scope === 'school'
                          ? 'ทุกคนในโรงเรียน'
                          : 'เฉพาะครูที่มอบสิทธิ์'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ gap: 0.5, display: 'flex', flexWrap: 'wrap', maxWidth: 320 }}>
                      {license.feature_keys.slice(0, 3).map((feature) => (
                        <Chip
                          key={feature}
                          size="small"
                          label={FEATURE_LABELS.get(feature) ?? feature}
                        />
                      ))}
                      {license.feature_keys.length > 3 && (
                        <Chip size="small" label={`+${license.feature_keys.length - 3}`} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {fDate(license.starts_at)} – {fDate(license.expires_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {license.license_scope === 'school'
                      ? 'ไม่จำกัดจำนวน'
                      : `${license.used_seats} จาก ${license.seat_count} คน`}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={license.is_current ? 'success' : 'default'}
                      label={licenseStatus(license)}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {license.license_scope === 'teacher' && (
                      <Button
                        size="small"
                        disabled={!license.is_current}
                        onClick={() => setSelectedLicense(license)}
                      >
                        เลือกครูที่ใช้ได้
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Box
        sx={{
          gap: 3,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
        }}
      >
        <Card variant="outlined">
          <Box sx={{ px: 3, py: 2.5 }}>
            <Typography variant="h6">ผู้ใช้ระบบ E-KRU ของโรงเรียน</Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
              ครูที่ตอบรับคำเชิญและเข้าใช้ระบบ E-KRU ที่โรงเรียนซื้อได้
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ผู้ใช้งาน</TableCell>
                  <TableCell>บทบาท</TableCell>
                  <TableCell>เข้าร่วมเมื่อ</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {!data?.members.length && (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ py: 5, textAlign: 'center' }}>
                      ยังไม่มีผู้ใช้งาน
                    </TableCell>
                  </TableRow>
                )}
                {data?.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Typography variant="subtitle2">
                        {memberDisplayName(member, data?.teachers ?? [])}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {member.user?.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {MEMBER_ROLE_LABELS[member.membership_role] ?? member.membership_role}
                    </TableCell>
                    <TableCell>{fDate(member.joined_at)}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        color="error"
                        disabled={removeMemberMutation.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `นำ ${memberDisplayName(member, data?.teachers ?? [])} ออกจากผู้ใช้ระบบ E-KRU ของโรงเรียนใช่ไหม?`
                            )
                          ) {
                            removeMemberMutation.mutate(member.id);
                          }
                        }}
                      >
                        นำออก
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        <Card variant="outlined">
          <Box sx={{ px: 3, py: 2.5 }}>
            <Typography variant="h6">คำเชิญที่รอการตอบรับ</Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
              ครูในรายการนี้ยังไม่ได้กดยอมรับการใช้ระบบ E-KRU ของโรงเรียน
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>อีเมลที่เชิญ</TableCell>
                  <TableCell>ยอมรับได้ถึง</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {!pendingInvitationsList.length && (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ py: 5, textAlign: 'center' }}>
                      ไม่มีคำเชิญที่รอตอบรับ
                    </TableCell>
                  </TableRow>
                )}
                {pendingInvitationsList.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.invited_email}</TableCell>
                    <TableCell>{fDate(invitation.expires_at)}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button
                          size="small"
                          color="inherit"
                          disabled={resendInvitationMutation.isPending}
                          onClick={() => resendInvitationMutation.mutate(invitation.id)}
                        >
                          แจ้งเตือนอีกครั้ง
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          disabled={revokeInvitationMutation.isPending}
                          onClick={() => {
                            if (
                              window.confirm(`ยกเลิกคำเชิญของ ${invitation.invited_email} ใช่ไหม?`)
                            ) {
                              revokeInvitationMutation.mutate(invitation.id);
                            }
                          }}
                        >
                          ยกเลิก
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>

      <Dialog
        open={!!selectedLicense}
        onClose={() => !assignmentMutation.isPending && setSelectedLicense(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>เลือกครูที่ได้ใช้ระบบ E-KRU นี้</DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            มอบสิทธิ์แล้ว {currentSelectedLicense?.used_seats ?? 0} จาก{' '}
            {currentSelectedLicense?.seat_count ?? 0} คน —
            ทำเครื่องหมายหน้าชื่อครูเพื่อมอบหรือถอนสิทธิ์
          </Alert>
          {data?.teachers.map((teacher) => {
            const assignment = data.assignments.find(
              (item) =>
                item.license_id === currentSelectedLicense?.id && item.teacher_id === teacher.id
            );
            const full =
              !assignment &&
              (currentSelectedLicense?.used_seats ?? 0) >=
                (currentSelectedLicense?.seat_count ?? 0);
            return (
              <Box
                key={teacher.id}
                sx={{
                  py: 1,
                  gap: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Checkbox
                  checked={!!assignment}
                  disabled={
                    !teacher.is_active ||
                    full ||
                    (assignmentMutation.isPending &&
                      assignmentMutation.variables?.teacherId === teacher.id)
                  }
                  onChange={() =>
                    currentSelectedLicense &&
                    assignmentMutation.mutate({
                      licenseId: currentSelectedLicense.id,
                      teacherId: teacher.id,
                      assignmentId: assignment?.id,
                    })
                  }
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2">{teacherName(teacher)}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {teacher.email ?? teacher.username}
                  </Typography>
                </Box>
                {!teacher.auth_user_id && (
                  <Chip
                    size="small"
                    color="warning"
                    label="ยังไม่เชื่อมบัญชีเข้าสู่ระบบ"
                    sx={{ ml: 'auto' }}
                  />
                )}
              </Box>
            );
          })}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedLicense(null)}>ปิด</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={inviteOpen}
        onClose={() => !inviteMutation.isPending && setInviteOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>เชิญครูใช้ระบบ E-KRU</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            กรอกอีเมลที่ตรงกับบัญชีครู ระบบจะแสดงแจ้งเตือนให้ครูกดยอมรับ หากครูยังไม่มีบัญชี
            คำเชิญจะแสดงอัตโนมัติเมื่อครูเข้าสู่ระบบด้วยอีเมลนี้
          </Typography>
          <TextField
            autoFocus
            fullWidth
            type="email"
            label="อีเมลของครู"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setInviteOpen(false)}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            loading={inviteMutation.isPending}
            disabled={!inviteEmail.trim()}
            onClick={() => inviteMutation.mutate(inviteEmail.trim())}
          >
            ส่งคำเชิญ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
