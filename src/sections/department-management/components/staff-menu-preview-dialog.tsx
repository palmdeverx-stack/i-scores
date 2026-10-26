'use client';

import type { NavItemDataProps } from 'src/components/nav-section';

import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { navData } from 'src/layouts/nav-config-teacher';

import {
  filterDashboardNav,
  useSchoolSubscription,
} from 'src/sections/school-subscription/use-school-subscription';
import {
  dedupeTeacherNav,
  filterNavByDepartment,
  groupPersonalWorkspaceNav,
} from 'src/sections/teacher-department/filter-nav-by-department';

import { useAuthContext } from 'src/auth/hooks';

export function StaffMenuPreviewDialog({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const { user: viewer } = useAuthContext();
  const subscription = useSchoolSubscription(viewer?.school_id);
  const query = useQuery({
    queryKey: ['staff-menu-preview', viewer?.school_id, userId],
    queryFn: async () => {
      const response = await fetch(
        `/api/access-permissions/${encodeURIComponent(userId)}/navigation`,
        { cache: 'no-store' }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      return data.user;
    },
  });
  const user = query.data;
  const licensed = filterDashboardNav(
    navData,
    subscription.data?.subscription.enabled_features ?? []
  );
  const groups =
    user?.is_active === false
      ? []
      : user?.is_personal_workspace
        ? groupPersonalWorkspaceNav(
            dedupeTeacherNav(
              licensed.map((group) => ({
                ...group,
                items: group.items.filter((item) => !item.path.endsWith('/lesson-plan-reviews')),
              }))
            )
          )
        : dedupeTeacherNav(
            filterNavByDepartment(
              licensed,
              user?.departments ?? [],
              user?.department_permissions ?? [],
              !!user?.is_school_director,
              user?.manage_permissions ?? []
            )
          );
  return (
    <Dialog open fullWidth maxWidth="md" onClose={onClose}>
      <DialogTitle>
        เมนูที่บุคลากรเข้าถึงได้
        {user
          ? ` · ${[user.first_name, user.last_name].filter(Boolean).join(' ') || user.username}`
          : ''}
      </DialogTitle>
      <DialogContent>
        {user?.is_active === false && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            บัญชีนี้ปิดใช้งาน ไม่สามารถเข้าสู่ระบบหรือเปิดเมนูได้
          </Alert>
        )}
        <Alert severity="info" sx={{ mb: 2 }}>
          แสดงสิทธิ์ที่บันทึกแล้ว รวมประเภทบุคลากร สิทธิ์ฝ่าย สิทธิ์รายบุคคล และแพ็กเกจของโรงเรียน
          การแก้ไขที่ยังไม่บันทึกจะไม่แสดงในตัวอย่างนี้
        </Alert>
        {query.error && (
          <Alert severity="error" action={<Button onClick={() => query.refetch()}>ลองใหม่</Button>}>
            {query.error.message}
          </Alert>
        )}
        {subscription.error && <Alert severity="error">โหลดแพ็กเกจไม่สำเร็จ</Alert>}
        {query.isLoading || subscription.isLoading ? (
          <Typography>กำลังตรวจสอบเมนู…</Typography>
        ) : (
          user &&
          !subscription.error &&
          groups.map((group) => (
            <Box key={group.subheader} sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                {group.subheader}
              </Typography>
              <PreviewItems items={group.items} />
            </Box>
          ))
        )}
        {user &&
          !query.isLoading &&
          !subscription.isLoading &&
          !subscription.error &&
          !groups.length && (
            <Typography color="text.secondary">
              ไม่มีเมนูที่ตรงกับสิทธิ์และแพ็กเกจปัจจุบัน
            </Typography>
          )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>ปิด</Button>
      </DialogActions>
    </Dialog>
  );
}
function PreviewItems({ items }: { items: NavItemDataProps[] }) {
  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      {items.map((item) => (
        <Box key={item.path}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">{item.title}</Typography>
            {item.caption?.includes('ดูข้อมูลเท่านั้น') && (
              <Chip size="small" label="ดูข้อมูลเท่านั้น" />
            )}
          </Box>
          {item.children && (
            <Box sx={{ pl: 3, mt: 1 }}>
              <PreviewItems items={item.children} />
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}
