'use client';

import type { SchoolFeatureKey } from 'src/lib/school-subscription-config';
import type {
  SubscriptionPlan,
  SubscriptionPlanInput,
  SubscriptionPlanTargetScope,
} from '../subscription-plan-actions';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Radio from '@mui/material/Radio';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import FormLabel from '@mui/material/FormLabel';
import Typography from '@mui/material/Typography';
import RadioGroup from '@mui/material/RadioGroup';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';

import { MASTER_ADMIN_SCHOOL_FEATURES } from 'src/lib/school-subscription-config';

import { RemixIcon } from 'src/components/remix-icon';

import { CapabilityBundleSelector } from './capability-bundle-selector';
import { featureKeysFromPlanBundles } from '../subscription-plan-actions';

// ----------------------------------------------------------------------

const LINE_FEATURE_KEY: SchoolFeatureKey = 'admin.line_notifications';

type Props = {
  plan: SubscriptionPlan | null;
  loading: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (input: SubscriptionPlanInput) => void;
};

function initialForm(plan: SubscriptionPlan | null): SubscriptionPlanInput {
  if (!plan) {
    return {
      code: '',
      name: '',
      description: '',
      targetScope: 'individual',
      maxSchoolAdmins: 1,
      maxTeachers: 20,
      maxStudents: 500,
      maxLineNotifications: 300,
      enabledFeatures: [],
      sourceBundles: [],
      isActive: true,
      sortOrder: 0,
    };
  }
  const sourceBundles = [...plan.source_bundles];
  return {
    code: plan.code,
    name: plan.name,
    description: plan.description ?? '',
    targetScope: plan.target_scope,
    maxSchoolAdmins: plan.max_school_admins,
    maxTeachers: plan.max_teachers,
    maxStudents: plan.max_students,
    maxLineNotifications: plan.max_line_notifications,
    enabledFeatures: sourceBundles.length
      ? featureKeysFromPlanBundles(sourceBundles)
      : [...plan.enabled_features],
    sourceBundles,
    isActive: plan.is_active,
    sortOrder: plan.sort_order,
  };
}

export function SubscriptionPlanFormDialog({ plan, loading, error, onClose, onSubmit }: Props) {
  const [form, setForm] = useState(() => initialForm(plan));
  const [featureGroup, setFeatureGroup] = useState('ผู้ดูแลโรงเรียน');
  const [selectionMode, setSelectionMode] = useState<'bundles' | 'advanced'>(() =>
    plan?.source_bundles.length ? 'bundles' : 'advanced'
  );

  const groups = Array.from(new Set(MASTER_ADMIN_SCHOOL_FEATURES.map((feature) => feature.group)));
  const groupFeatures = MASTER_ADMIN_SCHOOL_FEATURES.filter(
    (feature) => feature.group === featureGroup
  );
  const configurableEnabledFeatureCount = MASTER_ADMIN_SCHOOL_FEATURES.filter((feature) =>
    form.enabledFeatures.includes(feature.key)
  ).length;
  const groupKeys = groupFeatures.map((feature) => feature.key);
  const allGroupEnabled = groupKeys.every((key) => form.enabledFeatures.includes(key));
  const lineNotificationsEnabled = form.enabledFeatures.includes(LINE_FEATURE_KEY);
  const isValid =
    form.code.trim() &&
    form.name.trim() &&
    form.enabledFeatures.length > 0 &&
    [form.maxSchoolAdmins, form.maxTeachers, form.maxStudents, form.maxLineNotifications].every(
      (value) => Number.isInteger(value) && value >= 0
    );

  const setField = <K extends keyof SubscriptionPlanInput>(
    key: K,
    value: SubscriptionPlanInput[K]
  ) => setForm((current) => ({ ...current, [key]: value }));

  const setTargetScope = (targetScope: SubscriptionPlanTargetScope) => {
    setSelectionMode('bundles');
    setForm((current) => ({
      ...current,
      targetScope,
      sourceBundles: [],
      ...(targetScope === 'individual' && {
        maxSchoolAdmins: 0,
        maxTeachers: 0,
        maxStudents: 0,
        maxLineNotifications: 0,
      }),
    }));
  };

  const useBundleSelection = () => {
    setSelectionMode('bundles');
    setForm((current) => ({
      ...current,
      enabledFeatures: current.sourceBundles.length
        ? featureKeysFromPlanBundles(current.sourceBundles)
        : [],
    }));
  };

  const useAdvancedSelection = () => {
    setSelectionMode('advanced');
    setForm((current) => ({ ...current, sourceBundles: [] }));
  };

  const toggleFeature = (key: SchoolFeatureKey) => {
    if (key === LINE_FEATURE_KEY) {
      setLineNotifications(!lineNotificationsEnabled);
      return;
    }
    setField(
      'enabledFeatures',
      form.enabledFeatures.includes(key)
        ? form.enabledFeatures.filter((item) => item !== key)
        : [...form.enabledFeatures, key]
    );
  };

  const setLineNotifications = (enabled: boolean) => {
    setForm((current) => ({
      ...current,
      maxLineNotifications:
        enabled && current.targetScope !== 'individual' ? current.maxLineNotifications || 300 : 0,
      enabledFeatures: enabled
        ? Array.from(new Set([...current.enabledFeatures, LINE_FEATURE_KEY]))
        : current.enabledFeatures.filter((key) => key !== LINE_FEATURE_KEY),
    }));
  };

  return (
    <Dialog open fullWidth maxWidth="md" onClose={loading ? undefined : onClose}>
      <DialogTitle>{plan ? `แก้ไขแพ็กเกจ ${plan.name}` : 'สร้างแพ็กเกจใหม่'}</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 2 }}>
          ราคาและระยะเวลา License จัดการที่ EKRU Marketplace
        </Alert>

        <Typography variant="subtitle1">ข้อมูลแพ็กเกจ</Typography>
        <Box
          sx={{
            gap: 2,
            mt: 2,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
          }}
        >
          <TextField
            required
            label="รหัสแพ็กเกจ"
            value={form.code}
            onChange={(event) => setField('code', event.target.value.toUpperCase())}
            helperText="ใช้ A-Z, 0-9, _ หรือ -"
            slotProps={{ htmlInput: { maxLength: 50 } }}
          />
          <TextField
            required
            label="ชื่อแพ็กเกจ"
            value={form.name}
            onChange={(event) => setField('name', event.target.value)}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
          <TextField
            multiline
            minRows={2}
            label="คำอธิบาย"
            value={form.description}
            onChange={(event) => setField('description', event.target.value)}
            slotProps={{ htmlInput: { maxLength: 500 } }}
            sx={{ gridColumn: { sm: '1 / -1' } }}
          />
          <FormControl sx={{ gridColumn: { sm: '1 / -1' } }}>
            <FormLabel id="edit-plan-target-scope-label">แพ็กเกจนี้สร้างสำหรับ</FormLabel>
            <RadioGroup
              row
              aria-labelledby="edit-plan-target-scope-label"
              value={form.targetScope}
              onChange={(event) =>
                setTargetScope(event.target.value as SubscriptionPlanTargetScope)
              }
            >
              <FormControlLabel
                value="individual"
                control={<Radio />}
                label="บุคคล (ไม่อิงโรงเรียน)"
              />
              <FormControlLabel value="school" control={<Radio />} label="โรงเรียน" />
              <FormControlLabel value="both" control={<Radio />} label="ใช้ได้ทั้งสองแบบ" />
            </RadioGroup>
          </FormControl>
        </Box>

        {form.targetScope !== 'individual' ? (
          <Box sx={{ mt: 2 }}>
            <FormControl>
              <FormLabel id="edit-line-notification-label">
                แพ็กเกจนี้มีการแจ้งเตือน LINE หรือไม่
              </FormLabel>
              <RadioGroup
                row
                aria-labelledby="edit-line-notification-label"
                value={lineNotificationsEnabled ? 'yes' : 'no'}
                onChange={(event) => setLineNotifications(event.target.value === 'yes')}
              >
                <FormControlLabel value="no" control={<Radio />} label="ไม่มีการแจ้งเตือน LINE" />
                <FormControlLabel value="yes" control={<Radio />} label="มีการแจ้งเตือน LINE" />
              </RadioGroup>
            </FormControl>
            {lineNotificationsEnabled ? (
              <TextField
                type="number"
                label="จำนวนแจ้งเตือน LINE ต่อเดือน"
                value={form.maxLineNotifications}
                onChange={(event) =>
                  setField(
                    'maxLineNotifications',
                    Math.max(0, Math.floor(Number(event.target.value)))
                  )
                }
                helperText="ใส่ 0 เมื่อต้องการไม่จำกัด (โควตา LINE OA ยังมีผล)"
                slotProps={{ htmlInput: { min: 0 } }}
                sx={{ mt: 2, width: 1, maxWidth: 420 }}
              />
            ) : null}
          </Box>
        ) : null}

        {form.targetScope !== 'individual' ? (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle1">โควตาผู้ใช้งาน</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              ใส่ 0 เมื่อต้องการให้ใช้งานได้ไม่จำกัด
            </Typography>
            <Box
              sx={{
                gap: 2,
                mt: 2,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
              }}
            >
              {[
                ['maxSchoolAdmins', 'ผู้ดูแลโรงเรียน'],
                ['maxTeachers', 'ครูและบุคลากร'],
                ['maxStudents', 'นักเรียน'],
              ].map(([key, label]) => (
                <TextField
                  key={key}
                  type="number"
                  label={label}
                  value={form[key as 'maxSchoolAdmins' | 'maxTeachers' | 'maxStudents']}
                  onChange={(event) =>
                    setField(
                      key as 'maxSchoolAdmins' | 'maxTeachers' | 'maxStudents',
                      Math.max(0, Math.floor(Number(event.target.value)))
                    )
                  }
                  slotProps={{ htmlInput: { min: 0 } }}
                />
              ))}
            </Box>
          </>
        ) : null}

        <Divider sx={{ my: 3 }} />
        <Alert severity={form.enabledFeatures.length ? 'success' : 'info'} sx={{ mb: 2.5 }}>
          เลือกแล้ว {form.sourceBundles.length} ชุด · {configurableEnabledFeatureCount} เมนู
        </Alert>
        <Alert severity="warning" variant="outlined" sx={{ mb: 2.5 }}>
          หมายเหตุ: Worksheet AI ยังอยู่ระหว่างพัฒนา จึงซ่อนจากตัวเลือกแพ็กเกจชั่วคราว
          โดยสิทธิ์ที่เคยบันทึกไว้จะไม่ถูกลบ
        </Alert>
        <Box sx={{ gap: 1, mb: 3, display: 'flex', flexWrap: 'wrap' }}>
          <Button
            variant={selectionMode === 'bundles' ? 'contained' : 'outlined'}
            startIcon={<RemixIcon icon="solar:widget-4-bold" />}
            onClick={useBundleSelection}
          >
            เลือกแบบชุด (แนะนำ)
          </Button>
          <Button
            color="inherit"
            variant={selectionMode === 'advanced' ? 'contained' : 'outlined'}
            startIcon={<RemixIcon icon="solar:tuning-2-bold" />}
            onClick={useAdvancedSelection}
          >
            กำหนดรายเมนู
          </Button>
        </Box>

        {selectionMode === 'bundles' ? (
          <CapabilityBundleSelector
            targetScope={form.targetScope}
            enabledFeatures={form.enabledFeatures}
            sourceBundles={form.sourceBundles}
            onChange={(enabledFeatures, sourceBundles) =>
              setForm((current) => ({ ...current, enabledFeatures, sourceBundles }))
            }
          />
        ) : (
          <>
            <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
              โหมดนี้สำหรับปรับละเอียด การเปิดหรือปิดเมนูจะมีผลกับแพ็กเกจโดยตรง
            </Alert>
            <Box
              sx={{
                gap: 2,
                display: 'flex',
                alignItems: { xs: 'flex-start', sm: 'center' },
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                เลือกแล้ว {configurableEnabledFeatureCount} จาก{' '}
                {MASTER_ADMIN_SCHOOL_FEATURES.length} รายการ
              </Typography>
              <Button
                size="small"
                onClick={() => {
                  const currentKeys = new Set<SchoolFeatureKey>(groupKeys);
                  setField(
                    'enabledFeatures',
                    allGroupEnabled
                      ? form.enabledFeatures.filter((key) => !currentKeys.has(key))
                      : Array.from(new Set([...form.enabledFeatures, ...groupKeys]))
                  );
                }}
              >
                {allGroupEnabled ? 'ปิดทั้งหมดในกลุ่ม' : 'เปิดทั้งหมดในกลุ่ม'}
              </Button>
            </Box>
            <Tabs
              value={featureGroup}
              onChange={(_event, value: string) => setFeatureGroup(value)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mt: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
            >
              {groups.map((group) => (
                <Tab
                  key={group}
                  value={group}
                  label={`${group} (${
                    MASTER_ADMIN_SCHOOL_FEATURES.filter(
                      (feature) =>
                        feature.group === group && form.enabledFeatures.includes(feature.key)
                    ).length
                  })`}
                />
              ))}
            </Tabs>
            <Box>
              {groupFeatures.map((feature) => (
                <Box
                  key={feature.key}
                  sx={{
                    py: 1.25,
                    gap: 2,
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2">{feature.label}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {feature.description}
                    </Typography>
                  </Box>
                  <Switch
                    checked={form.enabledFeatures.includes(feature.key)}
                    onChange={() => toggleFeature(feature.key)}
                    inputProps={{ 'aria-label': `เปิดใช้งาน ${feature.label}` }}
                  />
                </Box>
              ))}
            </Box>
          </>
        )}

        <Box
          sx={{
            gap: 2,
            mt: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <TextField
            type="number"
            size="small"
            label="ลำดับแสดงผล"
            value={form.sortOrder}
            onChange={(event) => setField('sortOrder', Math.floor(Number(event.target.value)))}
            sx={{ maxWidth: 180 }}
          />
          <FormControlLabel
            label="เปิดให้เลือกใช้งาน"
            control={
              <Switch
                checked={form.isActive}
                onChange={(event) => setField('isActive', event.target.checked)}
              />
            }
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" disabled={loading} onClick={onClose}>
          ยกเลิก
        </Button>
        <Button
          variant="contained"
          loading={loading}
          disabled={!isValid}
          onClick={() => onSubmit(form)}
        >
          {plan ? 'บันทึกการแก้ไข' : 'สร้างแพ็กเกจ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
