'use client';

import type { ReactNode } from 'react';
import type { SchoolFeatureKey } from 'src/lib/school-subscription-config';
import type {
  SubscriptionPlanInput,
  SubscriptionPlanTargetScope,
} from '../subscription-plan-actions';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Radio from '@mui/material/Radio';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import FormLabel from '@mui/material/FormLabel';
import Typography from '@mui/material/Typography';
import RadioGroup from '@mui/material/RadioGroup';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { MASTER_ADMIN_SCHOOL_FEATURES } from 'src/lib/school-subscription-config';

import { toast } from 'src/components/snackbar';
import { RemixIcon } from 'src/components/remix-icon';

import { CapabilityBundleSelector } from '../components/capability-bundle-selector';
import { createSubscriptionPlan, featureKeysFromPlanBundles } from '../subscription-plan-actions';

// ----------------------------------------------------------------------

const FEATURE_GROUPS = Array.from(
  new Set(MASTER_ADMIN_SCHOOL_FEATURES.map((feature) => feature.group))
);
const LINE_FEATURE_KEY: SchoolFeatureKey = 'admin.line_notifications';

const EMPTY_FORM: SubscriptionPlanInput = {
  code: '',
  name: '',
  description: '',
  targetScope: 'individual',
  maxSchoolAdmins: 0,
  maxTeachers: 0,
  maxStudents: 0,
  maxLineNotifications: 0,
  enabledFeatures: [],
  sourceBundles: [],
  isActive: true,
  sortOrder: 0,
};

type SectionCardProps = {
  number: number;
  title: string;
  description: string;
  children: ReactNode;
};

function SectionCard({ number, title, description, children }: SectionCardProps) {
  return (
    <Card variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
      <Box sx={{ gap: 2, display: 'flex', alignItems: 'flex-start' }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            display: 'grid',
            borderRadius: '50%',
            color: 'primary.contrastText',
            bgcolor: 'primary.main',
            placeItems: 'center',
            fontWeight: 700,
          }}
        >
          {number}
        </Box>
        <Box>
          <Typography variant="h5">{title}</Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
            {description}
          </Typography>
        </Box>
      </Box>
      <Divider sx={{ my: 3 }} />
      {children}
    </Card>
  );
}

export function SubscriptionPlanCreateView() {
  const router = useRouter();
  const [form, setForm] = useState<SubscriptionPlanInput>(() => ({
    ...EMPTY_FORM,
    enabledFeatures: [...EMPTY_FORM.enabledFeatures],
  }));
  const [featureGroup, setFeatureGroup] = useState<string>(FEATURE_GROUPS[0]);
  const [selectionMode, setSelectionMode] = useState<'bundles' | 'advanced'>('bundles');

  const lineNotificationsEnabled = form.enabledFeatures.includes(LINE_FEATURE_KEY);
  const groupFeatures = MASTER_ADMIN_SCHOOL_FEATURES.filter(
    (feature) => feature.group === featureGroup
  );
  const configurableEnabledFeatureCount = MASTER_ADMIN_SCHOOL_FEATURES.filter((feature) =>
    form.enabledFeatures.includes(feature.key)
  ).length;
  const groupKeys = groupFeatures.map((feature) => feature.key);
  const allGroupEnabled = groupKeys.every((key) => form.enabledFeatures.includes(key));
  const isValid = Boolean(
    form.code.trim() &&
    form.name.trim() &&
    form.enabledFeatures.length > 0 &&
    [form.maxSchoolAdmins, form.maxTeachers, form.maxStudents].every(
      (value) => Number.isInteger(value) && value >= 0
    ) &&
    (!lineNotificationsEnabled ||
      (Number.isInteger(form.maxLineNotifications) && form.maxLineNotifications >= 0))
  );

  const createMutation = useMutation({
    mutationFn: createSubscriptionPlan,
    onSuccess: () => {
      toast.success('สร้างแพ็กเกจแล้ว');
      router.push(paths.master.subscriptionPlan.root);
    },
  });

  const setField = <K extends keyof SubscriptionPlanInput>(
    key: K,
    value: SubscriptionPlanInput[K]
  ) => setForm((current) => ({ ...current, [key]: value }));

  const setTargetScope = (targetScope: SubscriptionPlanTargetScope) => {
    setSelectionMode('bundles');
    setForm((current) => {
      if (targetScope === 'individual') {
        return {
          ...current,
          targetScope,
          sourceBundles: [],
          maxSchoolAdmins: 0,
          maxTeachers: 0,
          maxStudents: 0,
          maxLineNotifications: 0,
        };
      }
      if (current.targetScope === 'individual') {
        return {
          ...current,
          targetScope,
          sourceBundles: [],
          maxSchoolAdmins: 1,
          maxTeachers: 20,
          maxStudents: 500,
          maxLineNotifications: current.enabledFeatures.includes(LINE_FEATURE_KEY) ? 300 : 0,
        };
      }
      return { ...current, targetScope, sourceBundles: [] };
    });
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

  const toggleFeature = (key: SchoolFeatureKey) => {
    if (key === LINE_FEATURE_KEY) {
      setLineNotifications(!lineNotificationsEnabled);
      return;
    }
    setForm((current) => ({
      ...current,
      enabledFeatures: current.enabledFeatures.includes(key)
        ? current.enabledFeatures.filter((item) => item !== key)
        : [...current.enabledFeatures, key],
    }));
  };

  const toggleFeatureGroup = () => {
    setForm((current) => {
      const currentKeys = new Set<SchoolFeatureKey>(groupKeys);
      const enabledFeatures = allGroupEnabled
        ? current.enabledFeatures.filter((key) => !currentKeys.has(key))
        : Array.from(new Set([...current.enabledFeatures, ...groupKeys]));
      const hasLineNotifications = enabledFeatures.includes(LINE_FEATURE_KEY);
      return {
        ...current,
        enabledFeatures,
        maxLineNotifications: hasLineNotifications ? current.maxLineNotifications || 300 : 0,
      };
    });
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

  return (
    <Container maxWidth="xl" sx={{ pb: 7 }}>
      <Button
        component={RouterLink}
        href={paths.master.subscriptionPlan.root}
        color="inherit"
        startIcon={<RemixIcon icon="eva:arrow-ios-back-fill" />}
        sx={{ mb: 2 }}
      >
        กลับไปหน้ารายการ
      </Button>

      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h3">
          สร้างแพ็กเกจใหม่
        </Typography>
        <Typography sx={{ mt: 1, color: 'text.secondary' }}>
          กรอกข้อมูลตามหัวข้อด้านล่าง ทุกส่วนแสดงในหน้าเดียวและสามารถย้อนกลับมาแก้ไขได้ตลอด
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        ราคาขาย ประเภทการขาย และระยะเวลา License กำหนดที่ EKRU Marketplace
        หน้านี้ใช้กำหนดขอบเขตและสิทธิ์ของแพ็กเกจเท่านั้น
      </Alert>

      {createMutation.isError ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {createMutation.error.message}
        </Alert>
      ) : null}

      <Box sx={{ gap: 3, display: 'grid' }}>
        <SectionCard
          number={1}
          title="ข้อมูลแพ็กเกจ"
          description="ตั้งชื่อและรหัสกลางสำหรับเชื่อมกับ Marketplace"
        >
          <Box
            sx={{
              gap: 2.5,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
            }}
          >
            <TextField
              required
              label="รหัสแพ็กเกจ"
              value={form.code}
              onChange={(event) => setField('code', event.target.value.toUpperCase())}
              helperText="ใช้ A-Z, 0-9, _ หรือ - และนำไปใช้เป็น Plan code ใน Marketplace"
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
              minRows={3}
              label="คำอธิบาย"
              value={form.description}
              onChange={(event) => setField('description', event.target.value)}
              slotProps={{ htmlInput: { maxLength: 500 } }}
              sx={{ gridColumn: { sm: '1 / -1' } }}
            />
            <FormControl sx={{ gridColumn: { sm: '1 / -1' } }}>
              <FormLabel id="plan-target-scope-label">แพ็กเกจนี้สร้างสำหรับ</FormLabel>
              <RadioGroup
                row
                aria-labelledby="plan-target-scope-label"
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
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                แบบบุคคลจะสร้างพื้นที่ใช้งานส่วนตัวให้ผู้ซื้อ โดยไม่ต้องเลือกหรือสร้างโรงเรียน
              </Typography>
            </FormControl>
          </Box>
        </SectionCard>

        {form.targetScope !== 'individual' ? (
          <SectionCard
            number={2}
            title="โควตาการใช้งาน"
            description="ใส่ 0 สำหรับจำนวนผู้ใช้แบบไม่จำกัด ส่วน LINE เลือกก่อนว่าจะเปิดใช้หรือไม่"
          >
            <Typography variant="subtitle1">จำนวนบัญชี</Typography>
            <Box
              sx={{
                gap: 2.5,
                mt: 2,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
              }}
            >
              {(
                [
                  ['maxSchoolAdmins', 'ผู้ดูแลโรงเรียน'],
                  ['maxTeachers', 'ครูและบุคลากร'],
                  ['maxStudents', 'นักเรียน'],
                ] as const
              ).map(([key, label]) => (
                <TextField
                  key={key}
                  type="number"
                  label={label}
                  value={form[key]}
                  onChange={(event) =>
                    setField(key, Math.max(0, Math.floor(Number(event.target.value))))
                  }
                  slotProps={{ htmlInput: { min: 0 } }}
                />
              ))}
            </Box>

            <Divider sx={{ my: 3 }} />

            <FormControl>
              <FormLabel id="line-notification-label">
                แพ็กเกจนี้มีการแจ้งเตือน LINE หรือไม่
              </FormLabel>
              <RadioGroup
                row
                aria-labelledby="line-notification-label"
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
            ) : (
              <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
                ระบบจะปิด Feature “แจ้งเตือนผู้ปกครองผ่าน LINE” ในแพ็กเกจนี้
              </Alert>
            )}
          </SectionCard>
        ) : null}

        <SectionCard
          number={form.targetScope === 'individual' ? 2 : 3}
          title="เมนูและความสามารถ"
          description="เลือก Feature ที่ผู้ซื้อแพ็กเกจจะได้รับ เมนูฟรีไม่จำเป็นต้องเลือกในส่วนนี้"
        >
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
                <Button size="small" onClick={toggleFeatureGroup}>
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
                {FEATURE_GROUPS.map((group) => (
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
                      py: 1.5,
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
              gap: 3,
              mt: 3,
              display: 'flex',
              alignItems: { xs: 'flex-start', sm: 'center' },
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
            }}
          >
            <TextField
              type="number"
              size="small"
              label="ลำดับแสดงผล"
              value={form.sortOrder}
              onChange={(event) => setField('sortOrder', Math.floor(Number(event.target.value)))}
              sx={{ width: 180 }}
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
        </SectionCard>
      </Box>

      <Card
        variant="outlined"
        sx={{
          p: 2,
          mt: 3,
          gap: 1.5,
          bottom: 16,
          zIndex: 10,
          position: 'sticky',
          display: 'flex',
          bgcolor: 'background.paper',
          justifyContent: 'flex-end',
          boxShadow: (theme) => theme.customShadows.z8,
        }}
      >
        <Button
          color="inherit"
          component={RouterLink}
          href={paths.master.subscriptionPlan.root}
          disabled={createMutation.isPending}
        >
          ยกเลิก
        </Button>
        <Button
          variant="contained"
          loading={createMutation.isPending}
          disabled={!isValid}
          onClick={() => createMutation.mutate(form)}
        >
          สร้างแพ็กเกจ
        </Button>
      </Card>
    </Container>
  );
}
