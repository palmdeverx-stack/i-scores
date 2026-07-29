'use client';

import type { EkruApp, EkruAppInput } from '../ekru-app-actions';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
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

import {
  listEkruApps,
  createEkruApp,
  updateEkruApp,
  deleteEkruApp,
} from '../ekru-app-actions';

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

export function EkruAppListView() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<EkruApp | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<EkruAppInput>(EMPTY_FORM);

  const appsQuery = useQuery({ queryKey: ['ekru-apps'], queryFn: listEkruApps });
  const saveMutation = useMutation({
    mutationFn: () =>
      editing ? updateEkruApp(editing.id, form) : createEkruApp(form),
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

      {appsQuery.isLoading && <LinearProgress sx={{ mb: 2 }} />}
      {appsQuery.isError && <Alert severity="error">{appsQuery.error.message}</Alert>}

      <Card variant="outlined">
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
      </Card>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'แก้ไขระบบย่อย' : 'เพิ่มระบบย่อย'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ gap: 2.5, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
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
            disabled={
              !form.code || !form.name || !form.launchPath || !form.requiredFeatureKey
            }
            onClick={() => saveMutation.mutate()}
          >
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
