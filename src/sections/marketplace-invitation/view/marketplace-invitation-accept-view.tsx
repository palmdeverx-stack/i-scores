'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fDateTime } from 'src/utils/format-time';

import { toast } from 'src/components/snackbar';
import { RemixIcon } from 'src/components/remix-icon';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

type InvitationDetail = {
  id: string;
  invitedEmail: string;
  expiresAt: string;
  status: InvitationStatus;
  schoolName: string;
};

async function getInvitation(id: string): Promise<InvitationDetail> {
  const response = await fetch(`/api/account/marketplace-invitations/${id}`);
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่พบคำเชิญนี้');
  return json.invitation;
}

async function acceptInvitation(id: string): Promise<void> {
  const response = await fetch(`/api/account/marketplace-invitations/${id}/accept`, {
    method: 'POST',
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถยอมรับคำเชิญได้');
}

const STATUS_LABEL: Record<InvitationStatus, string> = {
  pending: 'รอการยอมรับ',
  accepted: 'ยอมรับแล้ว',
  revoked: 'ถูกยกเลิก',
  expired: 'หมดอายุ',
};

export function MarketplaceInvitationAcceptView({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  const invitationQuery = useQuery({
    queryKey: ['marketplace-invitation', invitationId],
    queryFn: () => getInvitation(invitationId),
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptInvitation(invitationId),
    onSuccess: async () => {
      toast.success('เชื่อมบัญชีกับระบบ EKRU ของโรงเรียนแล้ว');
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      router.push(user?.role === 'school_admin' ? paths.admin.root : paths.teacher.root);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Box
      sx={{
        px: 2,
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.neutral',
        backgroundImage:
          'radial-gradient(circle at 50% 0%, rgba(22, 93, 255, 0.10), transparent 38%)',
      }}
    >
      <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 8 } }}>
        <Card
          sx={{
            overflow: 'hidden',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 24px 64px rgba(15, 23, 42, 0.10)',
          }}
        >
          <Box sx={{ px: { xs: 3, sm: 5 }, pt: { xs: 3.5, sm: 5 }, textAlign: 'center' }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                mx: 'auto',
                mb: 2.5,
                display: 'grid',
                borderRadius: 2.5,
                color: 'primary.main',
                placeItems: 'center',
                bgcolor: 'primary.lighter',
              }}
            >
              <RemixIcon icon="solar:letter-bold-duotone" width={34} />
            </Box>

            <Typography component="h1" variant="h4" sx={{ fontWeight: 800 }}>
              คำเชิญใช้ระบบ EKRU ของโรงเรียน
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
              ตรวจสอบรายละเอียดก่อนยืนยันการเข้าร่วม
            </Typography>
          </Box>

          {invitationQuery.isLoading && (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <CircularProgress size={30} />
              <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                กำลังตรวจสอบคำเชิญ...
              </Typography>
            </Box>
          )}

          {invitationQuery.isError && (
            <Box sx={{ p: { xs: 3, sm: 5 } }}>
              <Alert severity="error">{invitationQuery.error.message}</Alert>
            </Box>
          )}

          {invitationQuery.data && (
            <>
              <Box sx={{ p: { xs: 3 } }}>
                <Box
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    borderRadius: 2,
                    bgcolor: 'background.neutral',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Stack spacing={2} divider={<Divider flexItem />}>
                    <InvitationDetailRow
                      icon="solar:buildings-2-bold-duotone"
                      label="โรงเรียน"
                      value={invitationQuery.data.schoolName}
                    />
                    <InvitationDetailRow
                      icon="solar:letter-linear"
                      label="อีเมลที่ได้รับเชิญ"
                      value={invitationQuery.data.invitedEmail}
                    />
                    <InvitationDetailRow
                      icon="solar:calendar-date-bold-duotone"
                      label="ใช้ได้ถึง"
                      value={fDateTime(invitationQuery.data.expiresAt, 'DD/MM/YYYY HH:mm น.')}
                    />
                  </Stack>
                </Box>

                {/* <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'center' }}>
                  <Chip
                    label={STATUS_LABEL[invitationQuery.data.status]}
                    color={
                      invitationQuery.data.status === 'accepted'
                        ? 'success'
                        : invitationQuery.data.status === 'pending'
                          ? 'warning'
                          : 'error'
                    }
                    variant="soft"
                  />
                </Box> */}
              </Box>

              {/* <Divider /> */}

              <Box sx={{ p: { xs: 3 }, pt: 0, bgcolor: 'background.paper' }}>
                {invitationQuery.data.status === 'pending' ? (
                  <Stack spacing={1.5}>
                    <Button
                      fullWidth
                      size="large"
                      variant="contained"
                      loading={acceptMutation.isPending}
                      onClick={() => acceptMutation.mutate()}
                      startIcon={<RemixIcon icon="solar:check-circle-bold-duotone" />}
                      sx={{ minHeight: 50 }}
                    >
                      ยอมรับคำเชิญ
                    </Button>
                    <Typography
                      variant="caption"
                      sx={{ textAlign: 'center', color: 'text.secondary' }}
                    >
                      เมื่อยอมรับ คุณจะใช้ระบบ EKRU ที่โรงเรียนมอบสิทธิ์ให้ได้
                    </Typography>
                  </Stack>
                ) : (
                  <Alert
                    severity={invitationQuery.data.status === 'accepted' ? 'success' : 'warning'}
                  >
                    {invitationQuery.data.status === 'accepted'
                      ? 'คุณยอมรับคำเชิญนี้แล้ว'
                      : 'คำเชิญนี้ใช้งานไม่ได้แล้ว กรุณาติดต่อผู้ดูแลโรงเรียนเพื่อขอคำเชิญใหม่'}
                  </Alert>
                )}
              </Box>
            </>
          )}
        </Card>
      </Container>
    </Box>
  );
}

function InvitationDetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box
        sx={{
          width: 38,
          height: 38,
          flexShrink: 0,
          display: 'grid',
          borderRadius: 1.5,
          color: 'primary.main',
          placeItems: 'center',
          bgcolor: 'primary.lighter',
        }}
      >
        <RemixIcon icon={icon} width={21} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
          {label}
        </Typography>
        <Typography variant="subtitle2" sx={{ overflowWrap: 'anywhere' }}>
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}
