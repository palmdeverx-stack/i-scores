'use client';

import type { CapabilityBundle } from '../capability-bundle-actions';
import type { SchoolFeatureKey } from 'src/lib/school-subscription-config';
import type { PlanBundleSnapshot, SubscriptionPlanTargetScope } from '../subscription-plan-actions';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import { Stack } from '@mui/material';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { SCHOOL_FEATURES } from 'src/lib/school-subscription-config';

import { toast } from 'src/components/snackbar';
import { RemixIcon } from 'src/components/remix-icon';

import { featureKeysFromPlanBundles } from '../subscription-plan-actions';
import { listCapabilityBundles, createCapabilityBundle } from '../capability-bundle-actions';

// ----------------------------------------------------------------------

type Props = {
  targetScope: SubscriptionPlanTargetScope;
  enabledFeatures: SchoolFeatureKey[];
  sourceBundles: PlanBundleSnapshot[];
  onChange: (features: SchoolFeatureKey[], snapshots: PlanBundleSnapshot[]) => void;
};

const SCOPE_LABEL = {
  individual: 'บุคคล',
  school: 'โรงเรียน',
  both: 'ทั้งสองแบบ',
};

const FEATURE_BY_KEY = new Map(SCHOOL_FEATURES.map((feature) => [feature.key, feature]));

function snapshotOf(bundle: CapabilityBundle): PlanBundleSnapshot {
  return {
    id: bundle.id,
    code: bundle.code,
    name: bundle.name,
    version: bundle.version,
    featureKeys: [...bundle.feature_keys],
  };
}

export function CapabilityBundleSelector({
  targetScope,
  enabledFeatures,
  sourceBundles,
  onChange,
}: Props) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [updatingBundle, setUpdatingBundle] = useState<CapabilityBundle | null>(null);
  const [draft, setDraft] = useState({ code: '', name: '', description: '' });

  const bundlesQuery = useQuery({
    queryKey: ['capability-bundles'],
    queryFn: listCapabilityBundles,
  });

  const applyBundle = (bundle: CapabilityBundle) => {
    const otherSnapshots = sourceBundles.filter((snapshot) => snapshot.id !== bundle.id);
    const snapshots = [
      ...otherSnapshots,
      snapshotOf(bundle),
    ];
    onChange(featureKeysFromPlanBundles(snapshots), snapshots);
  };

  const removeBundle = (snapshot: PlanBundleSnapshot) => {
    const remaining = sourceBundles.filter((item) => item.id !== snapshot.id);
    onChange(featureKeysFromPlanBundles(remaining), remaining);
  };

  const createMutation = useMutation({
    mutationFn: createCapabilityBundle,
    onSuccess: async (bundle) => {
      await queryClient.invalidateQueries({ queryKey: ['capability-bundles'] });
      applyBundle(bundle);
      setCreateOpen(false);
      setDraft({ code: '', name: '', description: '' });
      toast.success('สร้างและเลือกชุดความสามารถแล้ว');
    },
  });

  const bundles = (bundlesQuery.data ?? []).filter(
    (bundle) => bundle.target_scope === 'both' || bundle.target_scope === targetScope
  );
  const canCreate = Boolean(draft.code.trim() && draft.name.trim() && enabledFeatures.length > 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          size="small"
          color="inherit"
          startIcon={<RemixIcon icon="mingcute:add-line" />}
          disabled={enabledFeatures.length === 0}
          onClick={() => setCreateOpen(true)}
        >
          บันทึกเมนูที่เลือกเป็นชุดใหม่
        </Button>
      </Box>

      {bundlesQuery.isLoading ? (
        <Box sx={{ py: 4, display: 'grid', placeItems: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : null}
      {bundlesQuery.isError ? (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {bundlesQuery.error.message}
        </Alert>
      ) : null}

      <Box
        sx={{
          gap: 1.5,
          mt: 2,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        {bundles.map((bundle) => {
          const selected = sourceBundles.find((snapshot) => snapshot.id === bundle.id);
          const outdated = selected && selected.version < bundle.version;
          return (
            <Card
              key={bundle.id}
              variant="outlined"
              sx={{
                p: 2,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? 'success.main' : 'divider',
                bgcolor: selected ? 'success.lighter' : 'background.paper',
              }}
            >
              <Box sx={{ gap: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="subtitle1">{bundle.name}</Typography>
                <Chip size="small" label={SCOPE_LABEL[bundle.target_scope]} />
                {selected ? (
                  <Chip size="small" color="success" label={`เลือกแล้ว v${selected.version}`} />
                ) : null}
              </Box>
              <Typography variant="body2" sx={{ mt: 0.75, color: 'text.secondary' }}>
                {bundle.description || 'ไม่มีคำอธิบาย'}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                {bundle.feature_keys.length} เมนู · เวอร์ชัน {bundle.version}
              </Typography>
              <Box sx={{ gap: 0.75, mt: 1.25, display: 'flex', flexWrap: 'wrap' }}>
                {bundle.feature_keys.map((featureKey) => {
                  const feature = FEATURE_BY_KEY.get(featureKey);
                  return (
                    <Chip
                      key={featureKey}
                      size="small"
                      variant="outlined"
                      label={feature?.label ?? featureKey}
                      title={feature?.description}
                      sx={{ bgcolor: 'background.paper' }}
                    />
                  );
                })}
              </Box>
              <Box sx={{ gap: 1, mt: 1.5, display: 'flex' }}>
                {outdated ? (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => setUpdatingBundle(bundle)}
                  >
                    ดูการเปลี่ยนแปลง
                  </Button>
                ) : selected ? (
                  <Button size="small" color="error" onClick={() => removeBundle(selected)}>
                    ยกเลิกเลือก
                  </Button>
                ) : (
                  <Button size="small" variant="outlined" onClick={() => applyBundle(bundle)}>
                    เลือกชุดนี้
                  </Button>
                )}
              </Box>
            </Card>
          );
        })}
      </Box>

      <Dialog open={createOpen} fullWidth maxWidth="sm" onClose={() => setCreateOpen(false)}>
        <DialogTitle>สร้างชุดจาก {enabledFeatures.length} เมนูที่เลือก</DialogTitle>
        <DialogContent dividers sx={{ gap: 2, display: 'grid' }}>
          <Stack spacing={1} py={2}>
            {createMutation.isError ? (
              <Alert severity="error">{createMutation.error.message}</Alert>
            ) : null}
            <TextField
              required
              label="รหัสชุด"
              value={draft.code}
              onChange={(event) =>
                setDraft((current) => ({ ...current, code: event.target.value.toUpperCase() }))
              }
              helperText="ใช้ A-Z, 0-9, _ หรือ -"
            />
            <TextField
              required
              label="ชื่อชุดความสามารถ"
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
            />
            <TextField
              multiline
              minRows={2}
              label="คำอธิบาย"
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
            />
            <Alert severity="info">
              ชุดนี้จะใช้กับขอบเขต “{SCOPE_LABEL[targetScope]}” และบันทึกเมนูที่เลือกอยู่ในปัจจุบัน
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            disabled={createMutation.isPending}
            onClick={() => setCreateOpen(false)}
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            loading={createMutation.isPending}
            disabled={!canCreate}
            onClick={() =>
              createMutation.mutate({
                ...draft,
                targetScope,
                featureKeys: enabledFeatures,
              })
            }
          >
            สร้างและเลือกชุด
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(updatingBundle)} onClose={() => setUpdatingBundle(null)}>
        <DialogTitle>อัปเดตตามชุดล่าสุด?</DialogTitle>
        <DialogContent dividers>
          {updatingBundle ? (
            <BundleDiff
              current={sourceBundles.find((snapshot) => snapshot.id === updatingBundle.id)}
              latest={updatingBundle}
            />
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setUpdatingBundle(null)}>
            ยังไม่อัปเดต
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (updatingBundle) applyBundle(updatingBundle);
              setUpdatingBundle(null);
            }}
          >
            ยืนยันการอัปเดต
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function BundleDiff({
  current,
  latest,
}: {
  current?: PlanBundleSnapshot;
  latest: CapabilityBundle;
}) {
  const previousKeys = new Set(current?.featureKeys ?? []);
  const latestKeys = new Set(latest.feature_keys);
  const added = latest.feature_keys.filter((key) => !previousKeys.has(key));
  const removed = (current?.featureKeys ?? []).filter((key) => !latestKeys.has(key));

  return (
    <Box sx={{ gap: 2, display: 'grid' }}>
      <Typography variant="body2">
        {latest.name}: เวอร์ชัน {current?.version ?? '-'} → {latest.version}
      </Typography>
      <Alert severity={added.length ? 'success' : 'info'}>เพิ่ม {added.length} เมนู</Alert>
      <Alert severity={removed.length ? 'warning' : 'info'}>นำออก {removed.length} เมนู</Alert>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        ระบบจะคำนวณสิทธิ์ใหม่จากชุดที่เลือกทั้งหมด เมนูที่ถูกนำออกจากทุกชุดจะถูกปิดด้วย
      </Typography>
    </Box>
  );
}
