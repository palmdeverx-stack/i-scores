'use client';

import type { SubscriptionPlan, SubscriptionPlanInput } from '../subscription-plan-actions';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { SCHOOL_FEATURES } from 'src/lib/school-subscription-config';

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
  const [formOpen, setFormOpen] = useState(false);
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
      await queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      setFormOpen(false);
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
  const activePlans = plans.filter((plan) => plan.is_active);
  const filteredPlans =
    planFilter === 'all' ? plans : plans.filter((plan) => plan.target_scope === planFilter);
  const enabledFeatureCount = new Set(activePlans.flatMap((plan) => plan.enabled_features)).size;
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
            สร้างแพ็กเกจกลางสำหรับบุคคล โรงเรียน หรือใช้ร่วมกันทั้งสองแบบ
          </Typography>
        </Box>
        <Button
          size="large"
          variant="contained"
          component={RouterLink}
          href={paths.master.subscriptionPlan.new}
          startIcon={<RemixIcon icon="mingcute:add-line" />}
        >
          สร้างแพ็กเกจ
        </Button>
      </Box>

      <Alert
        severity="info"
        icon={<RemixIcon icon="solar:layers-minimalistic-bold-duotone" width={24} />}
        sx={{ mb: 3, alignItems: 'center' }}
      >
        <Typography variant="subtitle2">แพ็กเกจบุคคลทำงานแบบรวมสิทธิ์</Typography>
        <Typography variant="body2">
          ผู้ซื้อสามารถมีหลายแพ็กเกจได้ ระบบจะแสดงเมนูที่ได้รับทั้งหมดในพื้นที่ส่วนตัวเดียวกัน
          และเมนูที่ซ้ำจะแสดงเพียงครั้งเดียว
        </Typography>
      </Alert>

      <Box
        sx={{
          mb: 4,
          gap: { xs: 1, sm: 3 },
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(3, 1fr)', md: 'repeat(3, minmax(0, 220px))' },
        }}
      >
        {(
          [
            ['แพ็กเกจทั้งหมด', plans.length, 'solar:box-minimalistic-bold'],
            ['กำลังเปิดใช้', activePlans.length, 'solar:check-circle-bold'],
            ['ความสามารถ', enabledFeatureCount, 'solar:settings-bold-duotone'],
          ] as const
        ).map(([label, value, icon]) => (
          <Box key={label} sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                flexShrink: 0,
                display: { xs: 'none', sm: 'grid' },
                borderRadius: 1.5,
                color: 'primary.main',
                placeItems: 'center',
                bgcolor: 'primary.lighter',
              }}
            >
              <RemixIcon icon={icon} width={24} />
            </Box>
            <Box>
              <Typography variant="h4">{String(value)}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {String(label)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {plansQuery.isLoading && (
        <Box sx={{ py: 12, display: 'grid', placeItems: 'center' }}>
          <CircularProgress />
        </Box>
      )}
      {plansQuery.isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => plansQuery.refetch()}>
              ลองอีกครั้ง
            </Button>
          }
        >
          {planQueryErrorMessage(plansQuery.error)}
        </Alert>
      )}
      {!plansQuery.isLoading && !plansQuery.isError && plans.length === 0 && (
        <Box sx={{ py: 10, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
          <RemixIcon icon="solar:box-minimalistic-bold" width={56} color="text.disabled" />
          <Typography variant="h6" sx={{ mt: 2 }}>
            ยังไม่มีแพ็กเกจ
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            สร้างแพ็กเกจแรกเพื่อเริ่มกำหนดสิทธิ์ให้ผู้ใช้งาน
          </Typography>
        </Box>
      )}

      {!plansQuery.isLoading && !plansQuery.isError && plans.length > 0 ? (
        <Box sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={planFilter}
            onChange={(_, value: PlanFilter) => setPlanFilter(value)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="กรองแพ็กเกจตามกลุ่มผู้ซื้อ"
          >
            <Tab value="all" label={`ทั้งหมด ${filterCounts.all}`} />
            <Tab value="individual" label={`บุคคล ${filterCounts.individual}`} />
            <Tab value="school" label={`โรงเรียน ${filterCounts.school}`} />
            <Tab value="both" label={`ทั้งสองแบบ ${filterCounts.both}`} />
          </Tabs>
        </Box>
      ) : null}

      {!plansQuery.isLoading && !plansQuery.isError && plans.length > 0 && filteredPlans.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h6">ยังไม่มีแพ็กเกจในกลุ่มนี้</Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
            เลือกกลุ่มอื่น หรือสร้างแพ็กเกจใหม่
          </Typography>
        </Box>
      ) : null}

      <Box
        sx={{
          gap: 2.5,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        {filteredPlans.map((plan) => (
          <Card
            key={plan.id}
            variant="outlined"
            sx={{
              p: { xs: 2.5, sm: 3 },
              opacity: plan.is_active ? 1 : 0.72,
              borderColor: plan.is_active ? 'divider' : 'text.disabled',
            }}
          >
            <Box sx={{ gap: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ gap: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="h5">{plan.name}</Typography>
                  <Label color={plan.is_active ? 'success' : 'default'}>
                    {plan.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                  </Label>
                  <Label color={plan.target_scope === 'individual' ? 'info' : 'default'}>
                    {TARGET_SCOPE_LABEL[plan.target_scope]}
                  </Label>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {plan.code} · ลำดับ {plan.sort_order}
                </Typography>
              </Box>
              <Chip size="small" variant="outlined" label="ราคาอยู่ที่ Marketplace" />
            </Box>

            <Typography variant="body2" sx={{ mt: 2, minHeight: 42, color: 'text.secondary' }}>
              {plan.description || 'ไม่มีคำอธิบาย'}
            </Typography>

            {plan.target_scope === 'individual' ? (
              <Box
                sx={{
                  mt: 2,
                  px: 1.5,
                  py: 1,
                  gap: 1,
                  display: 'flex',
                  borderRadius: 1,
                  alignItems: 'center',
                  color: 'info.dark',
                  bgcolor: 'info.lighter',
                }}
              >
                <RemixIcon icon="solar:layers-bold-duotone" width={20} />
                <Typography variant="caption">
                  รวมสิทธิ์และข้อมูลกับแพ็กเกจบุคคลอื่นในพื้นที่เดียวกัน
                </Typography>
              </Box>
            ) : null}

            {plan.target_scope !== 'individual' ? (
              <>
                <Divider sx={{ my: 2.5 }} />
                <Box
                  sx={{
                    gap: 2,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  }}
                >
                  {[
                    ['ผู้ดูแล', plan.max_school_admins],
                    ['ครู', plan.max_teachers],
                    ['นักเรียน', plan.max_students],
                  ].map(([label, value]) => (
                    <Box key={label}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {label}
                      </Typography>
                      <Typography variant="subtitle1">{quotaLabel(Number(value))}</Typography>
                    </Box>
                  ))}
                </Box>
              </>
            ) : null}

            <Divider sx={{ my: 2.5 }} />

            <Box>
              <Box sx={{ gap: 1, display: 'flex', alignItems: 'center' }}>
                <Typography variant="subtitle2">เมนูและความสามารถ</Typography>
                <Chip size="small" label={`${plan.enabled_features.length} เมนู`} />
              </Box>
              {plan.source_bundles.length ? (
                <Box sx={{ gap: 0.75, mt: 1.25, display: 'flex', flexWrap: 'wrap' }}>
                  {plan.source_bundles.map((bundle) => (
                    <Chip
                      key={`${bundle.id}:${bundle.version}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      label={`${bundle.name} · v${bundle.version}`}
                    />
                  ))}
                </Box>
              ) : null}
              <Box sx={{ gap: 0.75, mt: 1.25, display: 'flex', flexWrap: 'wrap' }}>
                {plan.enabled_features.slice(0, 6).map((featureKey) => (
                  <Chip
                    key={featureKey}
                    size="small"
                    variant="outlined"
                    label={FEATURE_BY_KEY.get(featureKey)?.label ?? featureKey}
                  />
                ))}
                {plan.enabled_features.length > 6 ? (
                  <Chip size="small" label={`+${plan.enabled_features.length - 6} เมนู`} />
                ) : null}
              </Box>
            </Box>

            <Box
              sx={{
                mt: 2.5,
                gap: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                {plan.target_scope !== 'individual' ? (
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                    LINE:{' '}
                    {plan.enabled_features.includes('admin.line_notifications')
                      ? plan.max_line_notifications === 0
                        ? 'ไม่จำกัด'
                        : `${quotaLabel(plan.max_line_notifications)} ครั้ง/เดือน`
                      : 'ไม่ใช้'}
                  </Typography>
                ) : (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    ไม่มีโควตาผู้ใช้งาน
                  </Typography>
                )}
              </Box>
              <Box>
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<RemixIcon icon="solar:pen-bold" />}
                  onClick={() => {
                    saveMutation.reset();
                    setEditingPlan(plan);
                    setFormOpen(true);
                  }}
                >
                  แก้ไข
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<RemixIcon icon="solar:trash-bin-trash-bold" />}
                  onClick={() => {
                    deleteMutation.reset();
                    setDeletingPlan(plan);
                  }}
                >
                  ลบ
                </Button>
              </Box>
            </Box>
          </Card>
        ))}
      </Box>

      {formOpen && (
        <SubscriptionPlanFormDialog
          plan={editingPlan}
          loading={saveMutation.isPending}
          error={saveMutation.error?.message}
          onClose={() => {
            setFormOpen(false);
            setEditingPlan(null);
          }}
          onSubmit={(input) => editingPlan && saveMutation.mutate({ plan: editingPlan, input })}
        />
      )}

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
