'use client';

import type { NavSectionProps } from 'src/components/nav-section';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
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
  const queryClient = useQueryClient();
  const settingsQuery = useSystemUiSettings();
  const updateMutation = useMutation({
    mutationFn: updateSystemUiSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SYSTEM_UI_SETTINGS_QUERY_KEY });
      toast.success('บันทึกการตั้งค่าทั้งระบบแล้ว');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const experimentalPaths = settingsQuery.data?.experimentalMenuPaths ?? [];

  const toggleMenu = (path: string) => {
    const nextPaths = experimentalPaths.includes(path)
      ? experimentalPaths.filter((item) => item !== path)
      : [...experimentalPaths, path];
    updateMutation.mutate(nextPaths);
  };

  return (
    <Container maxWidth="xl" sx={{ pb: 7 }}>
      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h3">
          ตั้งค่าหน้าตาระบบ
        </Typography>
        <Typography sx={{ mt: 0.75, color: 'text.secondary' }}>
          การเปลี่ยนแปลงมีผลกับผู้ใช้งานทุกโรงเรียนใน EKRU
        </Typography>
      </Box>

      {settingsQuery.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {settingsQuery.error.message}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 3 }}>
        เปิดสวิตช์ให้เมนูที่ยังอยู่ในช่วงทดลอง เมื่อปิดแล้ว badge จะหายจากผู้ใช้ทุกโรงเรียน
      </Alert>

      <Box sx={{ gap: 3, display: 'grid' }}>
        {MENU_GROUPS.map((group) => {
          const enabledCount = group.menus.filter((menu) =>
            experimentalPaths.includes(menu.path)
          ).length;
          return (
            <Card key={group.role} variant="outlined">
              <Box sx={{ px: { xs: 2.5, sm: 3 }, py: 2.5 }}>
                <Box sx={{ gap: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography component="h2" variant="h6">
                    เมนูสำหรับ{group.role}
                  </Typography>
                  <Label color={enabledCount ? 'warning' : 'default'}>
                    ทดลอง {enabledCount}/{group.menus.length}
                  </Label>
                </Box>
              </Box>
              <Divider />

              {group.menus.map((menu, index) => {
                const enabled = experimentalPaths.includes(menu.path);
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
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
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
                            disabled={settingsQuery.isLoading || updateMutation.isPending}
                            onChange={() => toggleMenu(menu.path)}
                            inputProps={{
                              'aria-label': `${enabled ? 'ปิด' : 'เปิด'}ป้ายเวอร์ชันทดลองสำหรับ${menu.title}`,
                            }}
                          />
                        }
                      />
                    </Box>
                    {index < group.menus.length - 1 && <Divider />}
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
