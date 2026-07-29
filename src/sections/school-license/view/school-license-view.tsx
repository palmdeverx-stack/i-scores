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

import { toast } from 'src/components/snackbar';
import { RemixIcon } from 'src/components/remix-icon';

import { inviteMarketplaceUser } from 'src/sections/user/user-actions';

import {
  getSchoolLicenses,
  assignTeacherLicense,
  revokeTeacherLicense,
} from '../school-license-actions';

// ----------------------------------------------------------------------

type LicenseRow = SchoolLicenseData['licenses'][number];

function teacherName(teacher: SchoolLicenseData['teachers'][number]) {
  return (
    `${teacher.name_prefix ?? ''}${teacher.first_name ?? ''} ${teacher.last_name ?? ''}`.trim() ||
    teacher.username
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
      toast.success(variables.assignmentId ? 'ถอน License จากครูแล้ว' : 'มอบ License ให้ครูแล้ว');
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const inviteMutation = useMutation({
    mutationFn: inviteMarketplaceUser,
    onSuccess: async ({ marketplaceUser }) => {
      toast.success(`ส่งคำเชิญไปที่ ${marketplaceUser.email} แล้ว`);
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
  const pendingInvitations =
    data?.invitations.filter((invitation) => invitation.invitation_status === 'pending').length ?? 0;
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
            License โรงเรียน
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            ตรวจสอบสิทธิ์ที่ซื้อจาก Marketplace และจัดสรรที่นั่งให้ครู
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<RemixIcon icon="solar:letter-bold-duotone" />}
          onClick={() => setInviteOpen(true)}
        >
          เชิญสมาชิก Marketplace
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
            label: 'License ที่ใช้งาน',
            value: currentLicenses.length,
            icon: 'solar:verified-check-bold-duotone',
          },
          {
            label: 'ที่นั่งรายครู',
            value: totalSeats ? `${usedSeats}/${totalSeats}` : 'ไม่จำกัด',
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
          <Typography variant="h6">License จาก Marketplace</Typography>
        </Box>
        <TableContainer>
          <Table sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell>สินค้า</TableCell>
                <TableCell>ขอบเขต</TableCell>
                <TableCell>Feature</TableCell>
                <TableCell>ระยะเวลา</TableCell>
                <TableCell>ที่นั่ง</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell align="right">การจัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!data?.licenses.length && !licenseQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 6, textAlign: 'center' }}>
                    ยังไม่มี License จาก Marketplace
                  </TableCell>
                </TableRow>
              )}
              {data?.licenses.map((license) => (
                <TableRow key={license.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {license.product?.title ?? 'สินค้า Marketplace'}
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
                      label={license.license_scope === 'school' ? 'ทั้งโรงเรียน' : 'รายครู'}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ gap: 0.5, display: 'flex', flexWrap: 'wrap', maxWidth: 320 }}>
                      {license.feature_keys.slice(0, 3).map((feature) => (
                        <Chip key={feature} size="small" label={feature} />
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
                      ? 'ทุกคน'
                      : `${license.used_seats}/${license.seat_count}`}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={license.is_current ? 'success' : 'default'}
                      label={license.is_current ? 'ใช้งานอยู่' : 'หมดอายุ/ยกเลิก'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {license.license_scope === 'teacher' && (
                      <Button
                        size="small"
                        disabled={!license.is_current}
                        onClick={() => setSelectedLicense(license)}
                      >
                        จัดสรรที่นั่ง
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
            <Typography variant="h6">สมาชิก Marketplace ของโรงเรียน</Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>สมาชิก</TableCell>
                  <TableCell>บทบาท</TableCell>
                  <TableCell>เข้าร่วมเมื่อ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!data?.members.length && (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ py: 5, textAlign: 'center' }}>
                      ยังไม่มีสมาชิก
                    </TableCell>
                  </TableRow>
                )}
                {data?.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Typography variant="subtitle2">
                        {[member.user?.first_name, member.user?.last_name]
                          .filter(Boolean)
                          .join(' ') ||
                          member.user?.username ||
                          '-'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {member.user?.email}
                      </Typography>
                    </TableCell>
                    <TableCell>{member.membership_role}</TableCell>
                    <TableCell>{fDate(member.joined_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        <Card variant="outlined">
          <Box sx={{ px: 3, py: 2.5 }}>
            <Typography variant="h6">คำเชิญล่าสุด</Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>อีเมล</TableCell>
                  <TableCell>สถานะ</TableCell>
                  <TableCell>การส่งอีเมล</TableCell>
                  <TableCell>หมดอายุ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!data?.invitations.length && (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ py: 5, textAlign: 'center' }}>
                      ยังไม่มีคำเชิญ
                    </TableCell>
                  </TableRow>
                )}
                {data?.invitations.slice(0, 10).map((invitation) => {
                  const status = {
                    accepted: 'ตอบรับแล้ว',
                    revoked: 'ยกเลิก',
                    expired: 'หมดอายุ',
                    pending: 'รอตอบรับ',
                  }[invitation.invitation_status];
                  return (
                    <TableRow key={invitation.id}>
                      <TableCell>{invitation.invited_email}</TableCell>
                      <TableCell>{status}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={
                            invitation.email_delivery_status === 'sent'
                              ? 'success'
                              : invitation.email_delivery_status === 'failed'
                                ? 'error'
                                : 'warning'
                          }
                          label={
                            invitation.email_delivery_status === 'sent'
                              ? 'ส่งแล้ว'
                              : invitation.email_delivery_status === 'failed'
                                ? 'ส่งไม่สำเร็จ'
                                : 'กำลังส่ง'
                          }
                        />
                      </TableCell>
                      <TableCell>{fDate(invitation.expires_at)}</TableCell>
                    </TableRow>
                  );
                })}
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
        <DialogTitle>จัดสรร License รายครู</DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            ใช้แล้ว {currentSelectedLicense?.used_seats ?? 0}/
            {currentSelectedLicense?.seat_count ?? 0} ที่นั่ง
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
                  <Chip size="small" color="warning" label="ยังไม่เชื่อม Auth" sx={{ ml: 'auto' }} />
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
        <DialogTitle>เชิญสมาชิก Marketplace</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            ส่งได้ทุกอีเมล หากผู้รับยังไม่มีบัญชี ระบบจะให้สมัครก่อนตอบรับคำเชิญ
          </Typography>
          <TextField
            autoFocus
            fullWidth
            type="email"
            label="อีเมล Marketplace"
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
