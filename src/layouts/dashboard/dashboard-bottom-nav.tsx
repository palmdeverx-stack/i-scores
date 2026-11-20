'use client';

import type { Breakpoint } from '@mui/material/styles';
import type { NavSectionProps, NavItemDataProps } from 'src/components/nav-section';

import Paper from '@mui/material/Paper';
import Portal from '@mui/material/Portal';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';

import { paths } from 'src/routes/paths';
import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useTranslate } from 'src/locales';

import { RiMenuLine } from 'src/components/remix-icon';

// ----------------------------------------------------------------------

type Props = {
  data: NavSectionProps['data'];
  layoutQuery?: Breakpoint;
  menuOpen?: boolean;
  onOpenMenu?: () => void;
};

const TEACHER_QUICK_ACTIONS = [
  { paths: [paths.teacher.root], label: 'หน้าหลัก' },
  { paths: [paths.teacher.timetable], label: 'ตารางสอน' },
  { paths: [paths.teacher.attendanceScan], label: 'สแกนเช็กชื่อ' },
  { paths: [paths.teacher.students, paths.teacher.departmentStudent], label: 'นักเรียน' },
  { paths: [paths.teacher.assignments], label: 'ชั้นเรียน' },
  { paths: [paths.teacher.workAttendance], label: 'ลงเวลา' },
  { paths: [paths.teacher.departmentEnrollment.root], label: 'ลงทะเบียน' },
] as const;

function findQuickAction(items: NavItemDataProps[], path: string): NavItemDataProps | undefined {
  for (const item of items) {
    const child = item.children && findQuickAction(item.children, path);
    if (child) return child;
    if (item.path === path && (!item.children?.length || path !== paths.teacher.students)) {
      return item;
    }
  }
  return undefined;
}

export function DashboardBottomNav({ data, layoutQuery = 'sm', menuOpen, onOpenMenu }: Props) {
  const pathname = usePathname();
  const { t } = useTranslate('navbar');
  const topLevelItems = data.flatMap((group) => group.items);
  const items = onOpenMenu
    ? TEACHER_QUICK_ACTIONS.flatMap(({ paths: candidates, label }) => {
        const item = candidates
          .map((path) => findQuickAction(topLevelItems, path))
          .find((candidate) => !!candidate);
        return item ? [{ ...item, title: t(label, { defaultValue: label }) }] : [];
      }).slice(0, 4)
    : topLevelItems
        .filter((item) => !!item.path && item.path !== '#' && item.path !== paths.teacher.root)
        .slice(0, 5);
  const currentPath = [...items]
    .sort((a, b) => b.path.length - a.path.length)
    .find(
      (item) => pathname === item.path || (item.deepMatch && pathname.startsWith(`${item.path}/`))
    )?.path;
  return (
    <Portal>
      <Paper
        component="nav"
        aria-label="เมนูหลักสำหรับครู"
        elevation={12}
        sx={{
          insetInline: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '100vw',
          zIndex: (theme) => (onOpenMenu ? theme.zIndex.drawer - 1 : theme.zIndex.modal),
          display: { xs: 'block', [layoutQuery]: 'none' },
          position: 'fixed',
          overflow: 'hidden',
          borderTop: '1px solid',
          borderColor: 'divider',
          borderRadius: 0,
          bgcolor: 'background.paper',
          pb: 'max(env(safe-area-inset-bottom), 0px)',
          transform: 'translate3d(0, 0, 0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          willChange: 'transform',
          touchAction: 'manipulation',
        }}
      >
        <BottomNavigation
          showLabels
          value={currentPath ?? false}
          sx={{
            height: 'var(--dashboard-bottom-nav-height, 66px)',
            bgcolor: 'background.paper',
            '& .MuiBottomNavigationAction-root': {
              px: 0.25,
              minWidth: 0,
              color: 'text.secondary',
            },
            '& .Mui-selected': { color: 'primary.main' },
            '& .MuiBottomNavigationAction-label': {
              mt: 0.25,
              maxWidth: '100%',
              overflow: 'hidden',
              fontSize: '0.64rem',
              lineHeight: 1.15,
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            },
            '& .MuiBottomNavigationAction-label.Mui-selected': {
              fontSize: onOpenMenu ? '0.64rem' : '0.68rem',
              fontWeight: 700,
            },
          }}
        >
          {items.map((item) => (
            <BottomNavigationAction
              key={item.path}
              component={RouterLink}
              href={item.path}
              value={item.path}
              label={item.title}
              aria-current={currentPath === item.path ? 'page' : undefined}
              icon={item.icon}
            />
          ))}
          {onOpenMenu ? (
            <BottomNavigationAction
              value="all-menus"
              label={t('เมนู', { defaultValue: 'เมนู' })}
              icon={<RiMenuLine />}
              aria-haspopup="dialog"
              aria-expanded={Boolean(menuOpen)}
              onClick={onOpenMenu}
            />
          ) : null}
        </BottomNavigation>
      </Paper>
    </Portal>
  );
}
