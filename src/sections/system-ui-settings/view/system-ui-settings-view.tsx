'use client';

import type { NavSectionProps } from 'src/components/nav-section';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { studentNavData } from 'src/layouts/nav-config-student';
import { navData as masterNavData } from 'src/layouts/nav-config-master';
import { navData as teacherNavData } from 'src/layouts/nav-config-teacher';
import { navData as adminNavData } from 'src/layouts/nav-config-dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';

import { updateSystemUiSettings } from '../system-ui-settings-actions';
import { useSystemUiSettings, SYSTEM_UI_SETTINGS_QUERY_KEY } from '../use-system-ui-settings';

// ----------------------------------------------------------------------

type MenuOption = { title: string; path: string };

function flattenDashboardMenus(data: NavSectionProps['data']): MenuOption[] {
  const unique = new Map<string, MenuOption>();
  data
    .flatMap((group) => group.items.map((item) => ({ title: item.title, path: item.path })))
    .forEach((item) => unique.set(item.path, item));
  return Array.from(unique.values());
}

const MENU_GROUPS = [
  { role: 'Master Admin', menus: flattenDashboardMenus(masterNavData) },
  { role: 'ผู้ดูแลโรงเรียน', menus: flattenDashboardMenus(adminNavData) },
  { role: 'ครู', menus: flattenDashboardMenus(teacherNavData) },
  {
    role: 'นักเรียน',
    menus: studentNavData.map((item) => ({ title: item.title, path: item.path })),
  },
];

// ----------------------------------------------------------------------

export function SystemUiSettingsView() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const queryClient = useQueryClient();
  const settingsQuery = useSystemUiSettings();
  const updateMutation = useMutation({
    mutationFn: updateSystemUiSettings,
    onSuccess: async (settings) => {
      queryClient.setQueryData(SYSTEM_UI_SETTINGS_QUERY_KEY, settings);
      await queryClient.invalidateQueries({ queryKey: SYSTEM_UI_SETTINGS_QUERY_KEY });
      toast.success('บันทึกการตั้งค่าทั้งระบบแล้ว');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const experimentalPaths = new Set(settingsQuery.data?.experimentalMenuPaths);
  const storageUnavailable = settingsQuery.data?.storageReady === false;
  const keyword = search.trim().toLocaleLowerCase('th');
  const visibleGroups = MENU_GROUPS.filter((group) => !role || group.role === role)
    .map((group) => ({
      ...group,
      visibleMenus: group.menus.filter((menu) =>
        `${menu.title || 'หน้าหลัก'} ${menu.path}`.toLocaleLowerCase('th').includes(keyword)
      ),
    }))
    .filter((group) => group.visibleMenus.length > 0);

  const toggleMenu = (path: string) => {
    updateMutation.mutate(
      experimentalPaths.has(path)
        ? [...experimentalPaths].filter((item) => item !== path)
        : [...experimentalPaths, path]
    );
  };

  return (
    <Container maxWidth="xl" sx={{ pb: { xs: 5, md: 7 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h3">
          ตั้งค่าหน้าตาระบบ
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75, color: 'text.secondary' }}>
          จัดการป้ายเวอร์ชันทดลองบนเมนู
          การเปลี่ยนแปลงจะบันทึกทันทีและมีผลกับทุกพื้นที่ที่ใช้เมนูนั้น
        </Typography>
      </Box>

      {settingsQuery.isError && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" onClick={() => settingsQuery.refetch()}>
              ลองอีกครั้ง
            </Button>
          }
        >
          {settingsQuery.error.message}
        </Alert>
      )}

      {storageUnavailable && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          ฐานข้อมูลยังไม่พร้อมบันทึกการตั้งค่า
        </Alert>
      )}

      <Card
        variant="outlined"
        sx={{
          mb: 3,
          p: { xs: 2, sm: 2.5 },
          gap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) 220px' },
        }}
      >
        <TextField
          size="small"
          label="ค้นหาชื่อเมนูหรือเส้นทาง"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <TextField
          select
          size="small"
          label="กลุ่มผู้ใช้"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          <MenuItem value="">ทุกกลุ่ม</MenuItem>
          {MENU_GROUPS.map((group) => (
            <MenuItem key={group.role} value={group.role}>
              {group.role}
            </MenuItem>
          ))}
        </TextField>
      </Card>
      {settingsQuery.isLoading && (
        <LinearProgress aria-label="กำลังโหลดการตั้งค่า" sx={{ mb: 3 }} />
      )}
      {!visibleGroups.length && (
        <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">ไม่พบเมนูที่ตรงกับตัวกรอง</Typography>
        </Card>
      )}

      <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
        {visibleGroups.map((group) => {
          const enabledCount = group.menus.filter((menu) =>
            experimentalPaths.has(menu.path)
          ).length;
          return (
            <Card key={group.role} variant="outlined">
              <Box sx={{ px: { xs: 2.5, sm: 3 }, py: 2.5 }}>
                <Box sx={{ gap: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography component="h2" variant="h6">
                    เมนูสำหรับ{group.role}
                  </Typography>
                  {settingsQuery.data && enabledCount > 0 && (
                    <Label color="warning">เปิดป้ายทดลอง {enabledCount} เมนู</Label>
                  )}
                </Box>
              </Box>
              <Divider />

              {group.visibleMenus.map((menu, index) => {
                const enabled = experimentalPaths.has(menu.path);
                return (
                  <Box key={menu.path}>
                    <Box
                      sx={{
                        gap: 2,
                        px: { xs: 2.5, sm: 3 },
                        py: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Box
                          sx={{ gap: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}
                        >
                          <Typography variant="subtitle2">{menu.title || 'หน้าหลัก'}</Typography>
                          {enabled && <Label color="warning">เวอร์ชันทดลอง</Label>}
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}
                        >
                          {menu.path}
                        </Typography>
                      </Box>
                      <FormControlLabel
                        label={enabled ? 'เปิด' : 'ปิด'}
                        labelPlacement="start"
                        sx={{ m: 0, flexShrink: 0 }}
                        control={
                          <Switch
                            checked={enabled}
                            disabled={
                              !settingsQuery.data ||
                              settingsQuery.isError ||
                              storageUnavailable ||
                              updateMutation.isPending
                            }
                            onChange={() => toggleMenu(menu.path)}
                            inputProps={{
                              'aria-label': `${enabled ? 'ปิด' : 'เปิด'}ป้ายเวอร์ชันทดลองสำหรับ${menu.title || 'หน้าหลัก'}`,
                            }}
                          />
                        }
                      />
                    </Box>
                    {index < group.visibleMenus.length - 1 && <Divider />}
                  </Box>
                );
              })}
            </Card>
          );
        })}
      </Box>
    </Container>
  );
}
