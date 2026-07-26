'use client';

import type { Department } from '../department-management-actions';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { navData as adminNavData } from 'src/layouts/nav-config-dashboard';
import { navData as teacherNavData } from 'src/layouts/nav-config-teacher';
import { DEPARTMENT_PERMISSIONS } from 'src/lib/department-permissions-config';

import { RemixIcon } from 'src/components/remix-icon';

import { listDepartments, updateDepartment } from '../department-management-actions';

// ----------------------------------------------------------------------

function flattenNav(data: typeof teacherNavData) {
  return data.flatMap((group) =>
    group.items.flatMap((item) => (item.children?.length ? item.children : [item]))
  );
}

// Flatten the actual sidebar configs so this page always reflects what's
// really wired up in the nav, instead of a hand-maintained duplicate.
const teacherMenuItems = flattenNav(teacherNavData);
const adminMenuItems = flattenNav(adminNavData);

const baseMenuItems = teacherMenuItems.filter(
  (item) => !item.requiresDepartment && !item.requiresDepartmentPermission
);

const departmentMenuItems = teacherMenuItems.filter(
  (item) => item.requiresDepartment && !item.requiresDepartmentPermission
);

// Every delegable permission unlocks pages inside the admin section (a
// delegated teacher reaches them via /admin, same as a school admin) — map
// each permission key to the admin nav items that declare it.
const PERMISSION_MENU_ITEMS: Record<string, string[]> = Object.fromEntries(
  DEPARTMENT_PERMISSIONS.map((permission) => [
    permission.key,
    adminMenuItems
      .filter((item) => item.requiresDepartmentPermission === permission.key)
      .map((item) => item.title),
  ])
);

function samePermissions(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((key) => set.has(key));
}

export function DepartmentPermissionsView() {
  const queryClient = useQueryClient();

  const {
    data: departments = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({ queryKey: ['departments'], queryFn: listDepartments });

  // Permission edits made in the table but not yet saved, keyed by department
  // id — only departments the admin actually touched get an entry here.
  const [draft, setDraft] = useState<Record<string, string[]>>({});

  const getPermissions = (department: Department) => draft[department.id] ?? department.permissions;

  const togglePermission = (department: Department, key: string, checked: boolean) => {
    const current = getPermissions(department);
    const next = checked ? [...current, key] : current.filter((permission) => permission !== key);
    setDraft((prev) => ({ ...prev, [department.id]: next }));
  };

  const dirtyDepartments = departments.filter(
    (department) => draft[department.id] && !samePermissions(draft[department.id], department.permissions)
  );
  const hasChanges = dirtyDepartments.length > 0;

  const saveMutation = useMutation({
    mutationFn: () =>
      Promise.all(
        dirtyDepartments.map((department) =>
          updateDepartment(department.id, {
            name: department.name,
            description: department.description ?? '',
            permissions: draft[department.id],
          })
        )
      ),
    onSuccess: async () => {
      setDraft({});
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });

  const discardChanges = () => setDraft({});

  return (
    <Container maxWidth={false} sx={{ pb: 5 }}>
      <Box sx={{ mb: 1 }}>
        <Button
          component={RouterLink}
          href={paths.admin.department.root}
          size="small"
          startIcon={<RemixIcon icon="eva:arrow-ios-back-fill" />}
        >
          กลับไปหน้ารายการฝ่าย
        </Button>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h3">
          จัดการสิทธิ์เข้าใช้งาน
        </Typography>
        <Typography sx={{ mt: 1, color: 'text.secondary' }}>
          เปิดสิทธิ์ให้ฝ่ายไหน สมาชิกทุกคนในฝ่ายนั้นจะเห็นเมนูและดูข้อมูลได้ทันที — ส่วนสิทธิ์
          แก้ไข/จัดการ ต้องไปมอบให้เป็นรายคนที่หน้า “จัดการสมาชิก” ของฝ่ายนั้นอีกที
        </Typography>
      </Box>

      {isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              ลองอีกครั้ง
            </Button>
          }
          sx={{ mb: 3 }}
        >
          ไม่สามารถโหลดรายการฝ่ายได้
        </Alert>
      )}

      {saveMutation.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          บันทึกสิทธิ์ไม่สำเร็จ กรุณาลองอีกครั้ง
        </Alert>
      )}

      {hasChanges && (
        <Alert
          severity="warning"
          variant="outlined"
          sx={{ mb: 3 }}
          action={
            <Box sx={{ gap: 1, display: 'flex' }}>
              <Button
                color="inherit"
                size="small"
                onClick={discardChanges}
                disabled={saveMutation.isPending}
              >
                ยกเลิก
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => saveMutation.mutate()}
                loading={saveMutation.isPending}
              >
                บันทึกการเปลี่ยนแปลง
              </Button>
            </Box>
          }
        >
          มีการแก้ไขสิทธิ์ {dirtyDepartments.length} ฝ่ายที่ยังไม่ได้บันทึก
        </Alert>
      )}

      <Card variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          เมนูที่ครูเห็นในระบบตอนนี้
        </Typography>

        <Box sx={{ gap: 2.5, display: 'flex', flexDirection: 'column' }}>
          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              เมนูพื้นฐาน — ครูทุกคนเห็นเหมือนกัน ไม่ต้องมีฝ่าย
            </Typography>
            <Box sx={{ gap: 0.75, display: 'flex', flexWrap: 'wrap' }}>
              {baseMenuItems.map((item) => (
                <Chip key={item.title} size="small" variant="soft" label={item.title} />
              ))}
            </Box>
          </Box>

          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              เมนูของสมาชิกฝ่าย — เหมือนกันทุกฝ่าย แค่มีสังกัดฝ่ายก็เห็น
            </Typography>
            <Box sx={{ gap: 0.75, display: 'flex', flexWrap: 'wrap', mb: 1 }}>
              {departmentMenuItems.map((item) => (
                <Chip key={item.title} size="small" variant="soft" color="primary" label={item.title} />
              ))}
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              ดูประกาศฝ่ายและรายชื่อสมาชิก — ถ้าเป็น “หัวหน้าฝ่าย” จะโพสต์ประกาศฝ่ายและจัดการสมาชิก/มอบสิทธิ์ได้เพิ่ม
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              เมนูที่ปลดล็อกตามสิทธิ์ (คอลัมน์ในตารางด้านล่าง)
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {DEPARTMENT_PERMISSIONS.map((permission) => (
                <Box key={permission.key} sx={{ gap: 0.75, display: 'flex', alignItems: 'baseline', flexWrap: 'wrap' }}>
                  {(PERMISSION_MENU_ITEMS[permission.key] ?? []).map((title) => (
                    <Chip key={title} size="small" variant="soft" color="info" label={title} />
                  ))}
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    — {permission.description}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Card>

      <Card variant="outlined">
        <TableContainer>
          <Table sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell>ฝ่าย</TableCell>
                {DEPARTMENT_PERMISSIONS.map((item) => (
                  <TableCell key={item.key}>
                    <Tooltip title={item.description}>
                      <Box sx={{ gap: 0.5, display: 'inline-flex', alignItems: 'center' }}>
                        {item.label}
                        <RemixIcon icon="solar:info-circle-bold" width={14} sx={{ color: 'text.disabled' }} />
                      </Box>
                    </Tooltip>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={1 + DEPARTMENT_PERMISSIONS.length}>กำลังโหลด...</TableCell>
                </TableRow>
              )}
              {!isLoading && !departments.length && (
                <TableRow>
                  <TableCell
                    colSpan={1 + DEPARTMENT_PERMISSIONS.length}
                    sx={{ py: 7, textAlign: 'center', color: 'text.secondary' }}
                  >
                    ยังไม่มีฝ่าย ไปที่หน้ารายการฝ่ายเพื่อเพิ่มฝ่ายก่อน
                  </TableCell>
                </TableRow>
              )}
              {departments.map((department) => {
                const isDirty = dirtyDepartments.some((d) => d.id === department.id);
                const permissions = getPermissions(department);
                return (
                  <TableRow key={department.id} hover selected={isDirty}>
                    <TableCell>
                      <Box sx={{ gap: 0.75, display: 'flex', alignItems: 'center' }}>
                        <Typography variant="subtitle2">{department.name}</Typography>
                        {isDirty && (
                          <Chip size="small" color="warning" variant="soft" label="ยังไม่บันทึก" />
                        )}
                      </Box>
                    </TableCell>
                    {DEPARTMENT_PERMISSIONS.map((item) => {
                      const granted = permissions.includes(item.key);
                      return (
                        <TableCell key={item.key}>
                          <Switch
                            checked={granted}
                            disabled={saveMutation.isPending}
                            onChange={(event) =>
                              togglePermission(department, item.key, event.target.checked)
                            }
                            inputProps={{
                              'aria-label': `สิทธิ์ ${item.label} ของ ${department.name}`,
                            }}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Container>
  );
}
