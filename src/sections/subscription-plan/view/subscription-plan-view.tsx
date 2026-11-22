'use client';

import type { SubscriptionPlan, SubscriptionPlanInput } from '../subscription-plan-actions';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
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
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { SCHOOL_FEATURES, MASTER_ADMIN_SCHOOL_FEATURES } from 'src/lib/school-subscription-config';

import { Label } from 'src/components/label';
import { RemixIcon } from 'src/components/remix-icon';

import { SubscriptionPlanFormDialog } from '../components/subscription-plan-form-dialog';
import {
  listSubscriptionPlans,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
} from '../subscription-plan-actions';

// ----------------------------------------------------------------------

const TARGET_SCOPE_LABEL = {
  individual: 'บุคคล',
  school: 'โรงเรียน',
  both: 'บุคคลและโรงเรียน',
};

const FEATURE_BY_KEY = new Map(SCHOOL_FEATURES.map((feature) => [feature.key, feature]));

type PlanFilter = 'all' | SubscriptionPlan['target_scope'];

function planQueryErrorMessage(error: Error) {
  if (error.message.includes("'target_scope'") && error.message.includes('schema cache')) {
    return 'ฐานข้อมูลยังไม่ได้อัปเดตโครงสร้างแพ็กเกจ กรุณารัน migration 20260802020000_subscription_plan_target_scope.sql แล้วรีโหลด Supabase schema cache';
  }
  return error.message;
}

function quotaLabel(value: number) {
  return value === 0 ? 'ไม่จำกัด' : value.toLocaleString('th-TH');
}

export function SubscriptionPlanView() {
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [detailPlan, setDetailPlan] = useState<SubscriptionPlan | null>(null);
  const [search, setSearch] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<SubscriptionPlan | null>(null);
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');

  const plansQuery = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => listSubscriptionPlans(true),
  });
  const saveMutation = useMutation({
    mutationFn: ({ plan, input }: { plan: SubscriptionPlan; input: SubscriptionPlanInput }) =>
      updateSubscriptionPlan(plan.id, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['subscription-plans'] }),
        queryClient.invalidateQueries({ queryKey: ['school-subscription-access'] }),
      ]);
      setEditingPlan(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSubscriptionPlan(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      setDeletingPlan(null);
    },
  });

  const plans = plansQuery.data ?? [];
  const keyword = search.trim().toLocaleLowerCase('th');
  const filteredPlans = plans.filter(
    (plan) =>
      (planFilter === 'all' || plan.target_scope === planFilter) &&
      `${plan.name} ${plan.code}`.toLocaleLowerCase('th').includes(keyword)
  );
  const openEditor = (plan: SubscriptionPlan) => {
    saveMutation.reset();
    setDetailPlan(null);
    setEditingPlan(plan);
  };
  const filterCounts = {
    all: plans.length,
    individual: plans.filter((plan) => plan.target_scope === 'individual').length,
    school: plans.filter((plan) => plan.target_scope === 'school').length,
    both: plans.filter((plan) => plan.target_scope === 'both').length,
  };

  return (
    <Container maxWidth="xl" sx={{ pb: 7 }}>
      <Box
        sx={{
          mb: 4,
          gap: 2,
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography component="h1" variant="h3">
            ตั้งค่าแพ็กเกจ
          </Typography>
          <Typography sx={{ mt: 0.75, color: 'text.secondary' }}>
            กำหนดฟีเจอร์และโควตาของแต่ละแพ็กเกจ ราคาขายตั้งที่ Marketplace
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" onClick={() => setCatalogOpen(true)}>
            ดูฟีเจอร์ทั้งหมด
          </Button>
          <Button
            variant="contained"
            component={RouterLink}
            href={paths.master.subscriptionPlan.new}
            startIcon={<RemixIcon icon="mingcute:add-line" />}
          >
            สร้างแพ็กเกจ
          </Button>
        </Box>
      </Box>

      {plansQuery.isError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => plansQuery.refetch()}>
              ลองอีกครั้ง
            </Button>
          }
        >
          {planQueryErrorMessage(plansQuery.error)}
        </Alert>
      )}

      <Card variant="outlined">
        <Tabs
          value={planFilter}
          onChange={(_, value: PlanFilter) => setPlanFilter(value)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="กรองแพ็กเกจตามกลุ่มผู้ซื้อ"
          sx={{ px: { xs: 1, sm: 2 } }}
        >
          <Tab value="all" label={`ทั้งหมด (${filterCounts.all})`} />
          <Tab value="individual" label={`บุคคล (${filterCounts.individual})`} />
          <Tab value="school" label={`โรงเรียน (${filterCounts.school})`} />
          <Tab value="both" label={`บุคคลและโรงเรียน (${filterCounts.both})`} />
        </Tabs>
        <Divider />
        <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
          <TextField
            size="small"
            label="ค้นหาชื่อหรือรหัสแพ็กเกจ"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ width: { xs: 1, sm: 320 } }}
          />
        </Box>

        <TableContainer>
          <Table
            aria-label="รายการแพ็กเกจ"
            aria-busy={plansQuery.isFetching}
            sx={{ minWidth: 680 }}
          >
            <TableHead>
              <TableRow>
                <TableCell>แพ็กเกจ</TableCell>
                <TableCell>กลุ่มผู้ซื้อ</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell>ฟีเจอร์</TableCell>
                <TableCell align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {plansQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} aria-label="กำลังโหลดแพ็กเกจ" />
                  </TableCell>
                </TableRow>
              )}
              {!plansQuery.isLoading && !plansQuery.isError && filteredPlans.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    {plans.length ? 'ไม่พบแพ็กเกจที่ตรงกับตัวกรอง' : 'ยังไม่มีแพ็กเกจ'}
                  </TableCell>
                </TableRow>
              )}
              {filteredPlans.map((plan) => (
                <TableRow key={plan.id} hover>
                  <TableCell component="th" scope="row" sx={{ minWidth: 200 }}>
                    <Typography variant="subtitle2" sx={{ overflowWrap: 'anywhere' }}>
                      {plan.name}
                    </Typography>
                    <Typography
                      component="div"
                      variant="caption"
                      color="text.secondary"
                      sx={{ overflowWrap: 'anywhere' }}
                    >
                      {plan.code} · ลำดับ {plan.sort_order}
                    </Typography>
                  </TableCell>
                  <TableCell>{TARGET_SCOPE_LABEL[plan.target_scope]}</TableCell>
                  <TableCell>
                    <Label color={plan.is_active ? 'success' : 'default'}>
                      {plan.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </Label>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {plan.enabled_features.length} ฟีเจอร์
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Button size="small" color="inherit" onClick={() => setDetailPlan(plan)}>
                      ดูรายละเอียด
                    </Button>
                    <Button size="small" onClick={() => openEditor(plan)}>
                      แก้ไข
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {editingPlan && (
        <SubscriptionPlanFormDialog
          plan={editingPlan}
          loading={saveMutation.isPending}
          error={saveMutation.error?.message}
          onClose={() => setEditingPlan(null)}
          onSubmit={(input) => saveMutation.mutate({ plan: editingPlan, input })}
        />
      )}

      {detailPlan && (
        <Dialog open onClose={() => setDetailPlan(null)} fullWidth maxWidth="sm">
          <DialogTitle>{detailPlan.name}</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" color="text.secondary">
              {detailPlan.code} · {TARGET_SCOPE_LABEL[detailPlan.target_scope]}
            </Typography>
            {detailPlan.description && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {detailPlan.description}
              </Typography>
            )}
            {detailPlan.target_scope !== 'individual' && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">โควตาโรงเรียน</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  ผู้ดูแล {quotaLabel(detailPlan.max_school_admins)} · ครู{' '}
                  {quotaLabel(detailPlan.max_teachers)} · นักเรียน{' '}
                  {quotaLabel(detailPlan.max_students)}
                </Typography>
                {detailPlan.enabled_features.includes('admin.line_notifications') && (
                  <Typography variant="body2" color="text.secondary">
                    แจ้งเตือน LINE{' '}
                    {detailPlan.max_line_notifications
                      ? `${quotaLabel(detailPlan.max_line_notifications)} ครั้งต่อเดือน`
                      : 'ไม่จำกัด'}
                  </Typography>
                )}
              </Box>
            )}
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2">
              ฟีเจอร์ในแพ็กเกจ ({detailPlan.enabled_features.length})
            </Typography>
            {detailPlan.enabled_features.length ? (
              <Box component="ul" sx={{ my: 1, pl: 2.5 }}>
                {detailPlan.enabled_features.map((key) => (
                  <Typography component="li" variant="body2" key={key}>
                    {FEATURE_BY_KEY.get(key)?.label ?? key}
                  </Typography>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                ยังไม่ได้เลือกฟีเจอร์
              </Typography>
            )}
            {detailPlan.source_bundles.length > 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 1.5 }}
              >
                ชุดฟีเจอร์ที่ใช้{' '}
                {detailPlan.source_bundles
                  .map((bundle) => `${bundle.name} (v${bundle.version})`)
                  .join(', ')}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              color="error"
              sx={{ mr: 'auto' }}
              onClick={() => {
                deleteMutation.reset();
                setDeletingPlan(detailPlan);
                setDetailPlan(null);
              }}
            >
              ลบแพ็กเกจ
            </Button>
            <Button color="inherit" onClick={() => setDetailPlan(null)}>
              ปิด
            </Button>
            <Button variant="contained" onClick={() => openEditor(detailPlan)}>
              แก้ไข
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <Dialog open={catalogOpen} onClose={() => setCatalogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>ฟีเจอร์สำหรับจัดแพ็กเกจ ({MASTER_ADMIN_SCHOOL_FEATURES.length})</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            เลือกฟีเจอร์ได้จากปุ่มแก้ไขของแต่ละแพ็กเกจ หรือสร้างแพ็กเกจใหม่
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              gap: 3,
            }}
          >
            {Array.from(new Set(MASTER_ADMIN_SCHOOL_FEATURES.map((feature) => feature.group))).map(
              (group) => (
                <Box key={group}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    {group}
                  </Typography>
                  {MASTER_ADMIN_SCHOOL_FEATURES.filter((feature) => feature.group === group).map(
                    (feature) => (
                      <Box
                        key={feature.key}
                        sx={{ py: 1.25, borderTop: 1, borderColor: 'divider' }}
                      >
                        <Typography variant="subtitle2">{feature.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {feature.description}
                        </Typography>
                      </Box>
                    )
                  )}
                </Box>
              )
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCatalogOpen(false)}>ปิด</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deletingPlan)} onClose={() => setDeletingPlan(null)}>
        <DialogTitle>ลบแพ็กเกจนี้?</DialogTitle>
        <DialogContent>
          <Typography>
            แพ็กเกจ “{deletingPlan?.name}” จะหายจากรายการ
            แต่ผู้ใช้งานหรือโรงเรียนที่เคยใช้แพ็กเกจนี้จะยังคงค่าเดิม
          </Typography>
          {deleteMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteMutation.error.message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            disabled={deleteMutation.isPending}
            onClick={() => setDeletingPlan(null)}
          >
            ยกเลิก
          </Button>
          <Button
            color="error"
            variant="contained"
            loading={deleteMutation.isPending}
            onClick={() => deletingPlan && deleteMutation.mutate(deletingPlan.id)}
          >
            ยืนยันการลบ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
