'use client';

import type { EkruApp, EkruAppInput } from '../ekru-app-actions';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
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

import { toast } from 'src/components/snackbar';
import { RemixIcon } from 'src/components/remix-icon';

import { listEkruApps, createEkruApp, updateEkruApp, deleteEkruApp } from '../ekru-app-actions';

// ----------------------------------------------------------------------

const EMPTY_FORM: EkruAppInput = {
  code: '',
  name: '',
  launchPath: '/apps/',
  requiredFeatureKey: '',
  supportedScope: 'individual',
  isActive: true,
};

const SCOPE_LABEL = {
  individual: 'บุคคล',
  school: 'โรงเรียน',
  both: 'บุคคลและโรงเรียน',
};

const GUIDE_STEPS = [
  {
    title: '1. ลงทะเบียนระบบย่อย',
    description: 'เพิ่ม Code, Launch path, Feature key และ Scope ในหน้านี้',
    icon: 'ri:apps-2-add-line',
  },
  {
    title: '2. ผูกแพ็กเกจ Marketplace',
    description: 'สินค้าใน Marketplace ต้อง grant Feature key เดียวกับระบบย่อย',
    icon: 'ri:shopping-bag-3-line',
  },
  {
    title: '3. ซื้อและ Provision สิทธิ์',
    description: 'เมื่อชำระเงิน ระบบสร้าง License และ Workspace แบบบุคคลหรือโรงเรียน',
    icon: 'ri:key-2-line',
  },
  {
    title: '4. Login และเปิดระบบ',
    description: 'เข้า Google ด้วยบัญชีเดียวกัน แล้วเปิดผ่าน /launch?app=CODE',
    icon: 'ri:login-circle-line',
  },
];

const FIELD_GUIDE = [
  ['Code', 'รหัสอ้างอิงจาก Marketplace เช่น WORKSHEET_AI ต้องเป็นตัวพิมพ์ใหญ่'],
  ['Launch path', 'หน้าปลายทางในระบบนี้ ต้องขึ้นต้นด้วย /apps/ เช่น /apps/worksheet-ai'],
  ['Feature key', 'สิทธิ์ที่สินค้า Marketplace มอบให้ ต้องตรงกันทุกตัวอักษร'],
  ['Scope: บุคคล', 'License เป็นของผู้ซื้อ และ Workspace แยกตามบัญชี Google'],
  ['Scope: โรงเรียน', 'ใช้ License และ Workspace ร่วมกันในโรงเรียน'],
  ['Scope: ทั้งสองแบบ', 'ตรวจสิทธิ์บุคคลก่อน ถ้าไม่พบจึงตรวจสิทธิ์โรงเรียน'],
];

export function EkruAppListView() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<EkruApp | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<EkruAppInput>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<'apps' | 'guide'>('apps');

  const appsQuery = useQuery({ queryKey: ['ekru-apps'], queryFn: listEkruApps });
  const saveMutation = useMutation({
    mutationFn: () => (editing ? updateEkruApp(editing.id, form) : createEkruApp(form)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ekru-apps'] });
      setFormOpen(false);
      toast.success('บันทึกระบบย่อยแล้ว');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteEkruApp,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ekru-apps'] });
      toast.success('ลบระบบย่อยแล้ว');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openForm = (app?: EkruApp) => {
    setEditing(app ?? null);
    setForm(
      app
        ? {
            code: app.code,
            name: app.name,
            launchPath: app.launch_path,
            requiredFeatureKey: app.required_feature_key,
            supportedScope: app.supported_scope,
            isActive: app.is_active,
          }
        : EMPTY_FORM
    );
    setFormOpen(true);
  };

  return (
    <Container maxWidth="xl" sx={{ pb: 7 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography component="h1" variant="h3">
            ระบบย่อย E-KRU
          </Typography>
          <Typography sx={{ mt: 0.75, color: 'text.secondary' }}>
            Master App สำหรับผูก Feature, Workspace และ Marketplace License
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<RemixIcon icon="mingcute:add-line" />}
          onClick={() => openForm()}
        >
          เพิ่มระบบย่อย
        </Button>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, value: 'apps' | 'guide') => setActiveTab(value)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="apps" label="รายการระบบย่อย" icon={<RemixIcon icon="ri:apps-2-line" />} iconPosition="start" />
        <Tab value="guide" label="วิธีใช้งาน" icon={<RemixIcon icon="ri:book-open-line" />} iconPosition="start" />
      </Tabs>

      {activeTab === 'guide' && <EkruAppGuide />}

      {activeTab === 'apps' && appsQuery.isLoading && <LinearProgress sx={{ mb: 2 }} />}
      {activeTab === 'apps' && appsQuery.isError && (
        <Alert severity="error">{appsQuery.error.message}</Alert>
      )}

      {activeTab === 'apps' && <Card variant="outlined">
        <TableContainer>
          <Table sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell>Code / ชื่อ</TableCell>
                <TableCell>Launch path</TableCell>
                <TableCell>Feature key</TableCell>
                <TableCell>Scope</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!appsQuery.data?.length && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 7, textAlign: 'center' }}>
                    ยังไม่มีระบบย่อย
                  </TableCell>
                </TableRow>
              )}
              {appsQuery.data?.map((app) => (
                <TableRow key={app.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{app.code}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {app.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{app.launch_path}</TableCell>
                  <TableCell>{app.required_feature_key}</TableCell>
                  <TableCell>{SCOPE_LABEL[app.supported_scope]}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={app.is_active ? 'success' : 'default'}
                      label={app.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => openForm(app)}>
                      แก้ไข
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(app.id)}
                    >
                      ลบ
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>}

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'แก้ไขระบบย่อย' : 'เพิ่มระบบย่อย'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ gap: 2.5, py: 2, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <TextField
              label="Code"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
            />
            <TextField
              label="ชื่อระบบ"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <TextField
              label="Launch path"
              value={form.launchPath}
              onChange={(event) => setForm({ ...form, launchPath: event.target.value })}
              sx={{ gridColumn: '1 / -1' }}
            />
            <TextField
              label="Required feature key"
              value={form.requiredFeatureKey}
              onChange={(event) => setForm({ ...form, requiredFeatureKey: event.target.value })}
              sx={{ gridColumn: '1 / -1' }}
            />
            <TextField
              select
              label="Scope"
              value={form.supportedScope}
              onChange={(event) =>
                setForm({
                  ...form,
                  supportedScope: event.target.value as EkruAppInput['supportedScope'],
                })
              }
            >
              {Object.entries(SCOPE_LABEL).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ px: 1, display: 'flex', alignItems: 'center' }}>
              <Switch
                checked={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
              />
              <Typography>เปิดใช้งาน</Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setFormOpen(false)}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            loading={saveMutation.isPending}
            disabled={!form.code || !form.name || !form.launchPath || !form.requiredFeatureKey}
            onClick={() => saveMutation.mutate()}
          >
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

function EkruAppGuide() {
  return (
    <Stack spacing={3}>
      <Alert severity="info" variant="outlined">
        ระบบย่อย E-KRU ทำหน้าที่ตรวจ Session, License, Feature และ Workspace ก่อนส่งผู้ใช้ไปยัง
        Launch path จึงต้องตั้งค่าทั้งฝั่ง E-KRU และสินค้า Marketplace ให้ตรงกัน
      </Alert>

      <Grid container spacing={2}>
        {GUIDE_STEPS.map((step) => (
          <Grid key={step.title} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Paper variant="outlined" sx={{ p: 2.5, height: 1 }}>
              <Box
                sx={{
                  mb: 2,
                  width: 44,
                  height: 44,
                  display: 'grid',
                  borderRadius: 1.5,
                  placeItems: 'center',
                  color: 'primary.main',
                  bgcolor: 'primary.lighter',
                }}
              >
                <RemixIcon icon={step.icon} />
              </Box>
              <Typography variant="subtitle1">{step.title}</Typography>
              <Typography variant="body2" sx={{ mt: 0.75, color: 'text.secondary' }}>
                {step.description}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Card variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h5">ค่าที่ต้องกรอก</Typography>
        <Stack divider={<Divider flexItem />} sx={{ mt: 2 }}>
          {FIELD_GUIDE.map(([label, description]) => (
            <Box
              key={label}
              sx={{
                py: 1.5,
                gap: 2,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' },
              }}
            >
              <Typography variant="subtitle2">{label}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {description}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ p: 3, height: 1 }}>
            <Typography variant="h5">ระบบตรวจอะไรตอนเปิดใช้งาน</Typography>
            <Stack spacing={1.25} sx={{ mt: 2 }}>
              {[
                'ระบบย่อยเปิดใช้งาน และ Code หรือ Launch path ถูกต้อง',
                'บัญชี Marketplace ยัง active และเชื่อมกับ Google บัญชีเดียวกัน',
                'License ยังไม่หมดอายุ และมี Feature key ที่ระบบย่อยกำหนด',
                'กรณีโรงเรียน ต้องเป็นสมาชิกโรงเรียน; License แบบที่นั่งครูต้องถูก assign',
                'Workspace ตรงกับผู้ซื้อหรือโรงเรียน โดยระบบจะสร้างให้อัตโนมัติถ้ายังไม่มี',
              ].map((item) => (
                <Stack key={item} direction="row" spacing={1} alignItems="flex-start">
                  <RemixIcon icon="ri:checkbox-circle-fill" sx={{ mt: 0.25, color: 'success.main' }} />
                  <Typography variant="body2">{item}</Typography>
                </Stack>
              ))}
            </Stack>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ p: 3, height: 1 }}>
            <Typography variant="h5">วิธีทดสอบหลังตั้งค่า</Typography>
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <Typography variant="body2">
                1. ซื้อสินค้าด้วยบัญชี Google ที่ต้องการทดสอบ และรอรายการเป็น paid/completed
              </Typography>
              <Typography variant="body2">
                2. ตรวจว่า Provision สำเร็จและสร้าง License พร้อม Workspace แล้ว
              </Typography>
              <Typography variant="body2">
                3. Login ที่ E-KRU ด้วย Google บัญชีเดิม แล้วเปิด <b>/launch?app=CODE</b>
              </Typography>
              <Typography variant="body2">
                4. ถ้าเข้าไม่ได้ ให้ตรวจ Scope, Feature key, วันหมดอายุ และสมาชิกโรงเรียนก่อน
              </Typography>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      <Alert severity="warning">
        Launch path ที่สร้างใหม่เป็นเพียงจุดรับการเปิดระบบ ต้องมีหน้า <b>/apps/[slug]</b>{' '}
        หรือ implementation ของระบบย่อยรองรับ Code นั้นด้วย มิฉะนั้นจะเห็นเพียงหน้าตรวจสิทธิ์สำเร็จ
      </Alert>
    </Stack>
  );
}
