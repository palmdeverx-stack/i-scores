'use client';

import type { NavMainProps } from '../types';

import Paper from '@mui/material/Paper';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';

import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------

export function StudentBottomNav({ data }: NavMainProps) {
  const pathname = usePathname();
  const currentPath = [...data]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) =>
      item.path === '/'
        ? pathname === '/'
        : pathname === item.path || pathname.startsWith(`${item.path}/`)
    )?.path;

  return (
    <Paper
      component="nav"
      aria-label="เมนูหลักนักเรียน"
      elevation={12}
      sx={{
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        display: { xs: 'block', md: 'none' },
        position: 'fixed',
        borderTop: '1px solid',
        borderColor: 'divider',
        borderRadius: 0,
        pb: 'env(safe-area-inset-bottom)',
      }}
    >
      <BottomNavigation
        showLabels
        value={currentPath ?? false}
        sx={{
          height: 66,
          bgcolor: 'background.paper',
          '& .MuiBottomNavigationAction-root': {
            px: 0.5,
            minWidth: 0,
            color: 'text.secondary',
          },
          '& .Mui-selected': { color: 'primary.main' },
          '& .MuiBottomNavigationAction-label': {
            mt: 0.25,
            fontSize: '0.68rem',
            lineHeight: 1.15,
            whiteSpace: 'nowrap',
          },
          '& .MuiBottomNavigationAction-label.Mui-selected': {
            fontSize: '0.72rem',
            fontWeight: 700,
          },
        }}
      >
        {data.map((item) => (
          <BottomNavigationAction
            key={item.path}
            component={RouterLink}
            href={item.path}
            value={item.path}
            label={item.title}
            icon={item.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
