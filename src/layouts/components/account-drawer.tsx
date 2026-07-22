'use client';

import type { IconButtonProps } from '@mui/material/IconButton';

import { varAlpha } from 'minimal-shared/utils';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Avatar from '@mui/material/Avatar';
import Drawer from '@mui/material/Drawer';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';
import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { useAuthContext } from 'src/auth/hooks';

import { AccountButton } from './account-button';
import { SignOutButton } from './sign-out-button';

// ----------------------------------------------------------------------

export type AccountDrawerProps = IconButtonProps & {
  data?: {
    label: string;
    href: string;
    icon?: React.ReactNode;
    info?: React.ReactNode;
  }[];
};

const ROLE_LABEL: Record<string, string> = {
  master_admin: 'ผู้ดูแลระบบหลัก',
  school_admin: 'ผู้ดูแลโรงเรียน',
  teacher: 'ครูผู้สอน',
  student: 'นักเรียน',
};

const ROOT_PATHS = [paths.master.root, paths.admin.root, paths.teacher.root, paths.student.root];

export function AccountDrawer({ data = [], sx, ...other }: AccountDrawerProps) {
  const pathname = usePathname();
  const { user } = useAuthContext();
  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();

  const isAdmin = user?.role === 'school_admin' || user?.role === 'master_admin';
  const avatarUrl = user?.avatar_url ?? user?.photoURL;
  const displayName = user?.displayName || user?.username || 'ผู้ใช้งาน';
  const roleLabel = ROLE_LABEL[user?.role] ?? 'ผู้ใช้งาน';

  const adminMenu: NonNullable<AccountDrawerProps['data']> =
    user?.role === 'master_admin'
      ? [
          {
            label: 'ภาพรวมระบบ',
            href: paths.master.root,
            icon: <Iconify icon="solar:home-angle-bold-duotone" />,
          },
          {
            label: 'จัดการโรงเรียน',
            href: paths.master.school.root,
            icon: <Iconify icon="solar:notebook-bold-duotone" />,
          },
          {
            label: 'ผู้ดูแลโรงเรียน',
            href: paths.master.schoolAdmin.root,
            icon: <Iconify icon="solar:users-group-rounded-bold-duotone" />,
          },
          {
            label: 'เปลี่ยนรหัสผ่าน',
            href: paths.auth.jwt.changePassword,
            icon: <Iconify icon="solar:shield-keyhole-bold-duotone" />,
          },
        ]
      : [
          {
            label: 'ภาพรวมโรงเรียน',
            href: paths.admin.root,
            icon: <Iconify icon="solar:home-angle-bold-duotone" />,
          },
          {
            label: 'ข้อมูลโรงเรียน',
            href: paths.admin.school,
            icon: <Iconify icon="solar:notebook-bold-duotone" />,
          },
          {
            label: 'บุคลากรและครู',
            href: paths.admin.user.root,
            icon: <Iconify icon="solar:users-group-rounded-bold-duotone" />,
          },
          {
            label: 'นักเรียน',
            href: paths.admin.student.root,
            icon: <Iconify icon="solar:user-rounded-bold" />,
          },
          {
            label: 'เปลี่ยนรหัสผ่าน',
            href: paths.auth.jwt.changePassword,
            icon: <Iconify icon="solar:shield-keyhole-bold-duotone" />,
          },
        ];

  const teacherMenu: NonNullable<AccountDrawerProps['data']> = [
    {
      label: 'หน้าหลักครู',
      href: paths.teacher.root,
      icon: <Iconify icon="solar:home-angle-bold-duotone" />,
    },
    {
      label: 'โปรไฟล์ของฉัน',
      href: paths.teacher.profile,
      icon: <Iconify icon="solar:user-rounded-bold" />,
    },
    {
      label: 'เปลี่ยนรหัสผ่าน',
      href: paths.auth.jwt.changePassword,
      icon: <Iconify icon="solar:shield-keyhole-bold-duotone" />,
    },
  ];

  const menuData = isAdmin ? adminMenu : user?.role === 'teacher' ? teacherMenu : data;

  return (
    <>
      <AccountButton
        onClick={onOpen}
        photoURL={avatarUrl}
        displayName={displayName}
        sx={sx}
        {...other}
      />

      <Drawer
        open={open}
        onClose={onClose}
        anchor="right"
        slotProps={{
          backdrop: {
            sx: {
              bgcolor: (theme) => varAlpha(theme.vars.palette.grey['900Channel'], 0.32),
              backdropFilter: 'blur(2px)',
            },
          },
          paper: {
            sx: {
              width: { xs: 'calc(100% - 24px)', sm: 360 },
              maxWidth: 360,
              bgcolor: 'background.paper',
            },
          },
        }}
      >
        <Scrollbar>
          <Box
            sx={{
              p: 3,
              pt: 5.5,
              color: isAdmin ? 'primary.contrastText' : 'text.primary',
              position: 'relative',
              background: isAdmin
                ? (theme) =>
                    `linear-gradient(145deg, ${theme.vars.palette.primary.darker}, ${theme.vars.palette.primary.main})`
                : 'background.neutral',
            }}
          >
            <IconButton
              onClick={onClose}
              aria-label="ปิดเมนูบัญชี"
              sx={{
                top: 10,
                right: 10,
                position: 'absolute',
                color: isAdmin ? 'inherit' : 'text.secondary',
                bgcolor: (theme) =>
                  isAdmin ? varAlpha(theme.vars.palette.common.whiteChannel, 0.08) : 'transparent',
                '&:hover': {
                  bgcolor: (theme) =>
                    isAdmin
                      ? varAlpha(theme.vars.palette.common.whiteChannel, 0.16)
                      : 'action.hover',
                },
              }}
            >
              <Iconify icon="mingcute:close-line" />
            </IconButton>

            <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
              <Avatar
                src={avatarUrl}
                alt={displayName}
                sx={{
                  width: 68,
                  height: 68,
                  flexShrink: 0,
                  typography: 'h5',
                  color: 'primary.main',
                  bgcolor: 'common.white',
                  border: (theme) =>
                    `3px solid ${varAlpha(theme.vars.palette.common.whiteChannel, 0.4)}`,
                }}
              >
                {displayName.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" noWrap>
                  {displayName}
                </Typography>
                <Typography
                  variant="body2"
                  noWrap
                  sx={{
                    mt: 0.25,
                    color: isAdmin
                      ? (theme) => varAlpha(theme.vars.palette.common.whiteChannel, 0.72)
                      : 'text.secondary',
                  }}
                >
                  {user?.email || `@${user?.username ?? '-'}`}
                </Typography>
                <Label
                  sx={{
                    mt: 1,
                    color: isAdmin ? 'common.white' : 'primary.darker',
                    bgcolor: (theme) =>
                      isAdmin
                        ? varAlpha(theme.vars.palette.common.whiteChannel, 0.14)
                        : theme.vars.palette.primary.lighter,
                  }}
                >
                  {roleLabel}
                </Label>
              </Box>
            </Box>

            {isAdmin && (
              <Box
                sx={{
                  p: 1.5,
                  gap: 1,
                  mt: 2.5,
                  display: 'flex',
                  borderRadius: 1.5,
                  alignItems: 'center',
                  bgcolor: (theme) => varAlpha(theme.vars.palette.common.whiteChannel, 0.08),
                }}
              >
                <Iconify icon="solar:shield-check-bold" width={20} />
                <Typography variant="caption" sx={{ opacity: 0.84 }}>
                  คุณกำลังใช้งานพื้นที่จัดการระบบของโรงเรียน
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ px: 2, py: 2.5 }}>
            <Typography
              variant="overline"
              sx={{ px: 1.5, mb: 1, display: 'block', color: 'text.disabled' }}
            >
              {isAdmin ? 'เมนูผู้ดูแล' : 'เมนูบัญชี'}
            </Typography>
            <MenuList disablePadding sx={{ gap: 0.5, display: 'grid' }}>
              {menuData.map((option) => {
                const isRootPath = ROOT_PATHS.includes(option.href);
                const selected =
                  pathname === option.href ||
                  (!isRootPath && option.href !== '#' && pathname.startsWith(`${option.href}/`));

                return (
                  <MenuItem key={`${option.label}-${option.href}`} disableGutters>
                    <Link
                      component={RouterLink}
                      href={option.href}
                      color="inherit"
                      underline="none"
                      onClick={onClose}
                      aria-current={selected ? 'page' : undefined}
                      sx={{
                        p: 1.25,
                        gap: 1.5,
                        width: 1,
                        minHeight: 48,
                        display: 'flex',
                        borderRadius: 1.25,
                        typography: 'subtitle2',
                        alignItems: 'center',
                        color: selected ? 'primary.main' : 'text.secondary',
                        bgcolor: selected
                          ? (theme) => varAlpha(theme.vars.palette.primary.mainChannel, 0.1)
                          : 'transparent',
                        '& svg': { width: 23, height: 23, flexShrink: 0 },
                        '&:hover': {
                          color: 'text.primary',
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      {option.icon}
                      <Box component="span" sx={{ minWidth: 0, flexGrow: 1 }}>
                        {option.label}
                      </Box>
                      {option.info && <Label color="error">{option.info}</Label>}
                      <Iconify
                        icon="eva:arrow-ios-forward-fill"
                        width={18}
                        sx={{ color: 'text.disabled' }}
                      />
                    </Link>
                  </MenuItem>
                );
              })}
            </MenuList>
          </Box>
        </Scrollbar>

        <Box
          sx={{
            p: 2.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <SignOutButton onClose={onClose} />
        </Box>
      </Drawer>
    </>
  );
}
