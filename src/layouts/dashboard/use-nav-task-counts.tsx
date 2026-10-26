'use client';

import type { NavSectionProps, NavItemDataProps } from 'src/components/nav-section';

import { useQuery, useIsMutating } from '@tanstack/react-query';

import Chip from '@mui/material/Chip';

import { useAuthContext } from 'src/auth/hooks';

import { useTaskNotifications } from './use-task-notifications';

export function useNavTaskCounts(data: NavSectionProps['data']) {
  useTaskNotifications();
  const { user } = useAuthContext();
  const pendingMutations = useIsMutating();
  const { data: counts } = useQuery({
    queryKey: ['navigation-task-counts', user?.school_id, user?.id, pendingMutations > 0],
    queryFn: async () => {
      const response = await fetch('/api/navigation/task-counts', { cache: 'no-store' });
      if (!response.ok) throw new Error('Task counts unavailable');
      return (await response.json()).counts as Record<string, number>;
    },
    enabled:
      Boolean(user?.school_id && ['teacher', 'school_admin'].includes(user.role)) &&
      pendingMutations === 0,
    refetchInterval: 60000,
    staleTime: 0,
    retry: 1,
  });
  const annotate = (item: NavItemDataProps): { item: NavItemDataProps; count: number } => {
    const children = item.children?.map(annotate);
    const path = item.path.replace(/^\/(admin|teacher)/, '').replace(/\/$/, '');
    const count = children?.length
      ? children.reduce((sum, child) => sum + child.count, 0)
      : (counts?.[path] ?? 0);
    return {
      count,
      item: {
        ...item,
        ...(children && { children: children.map((child) => child.item) }),
        ...(count > 0 && {
          info: (
            <Chip
              size="small"
              color="error"
              label={count > 99 ? '99+' : count}
              aria-label={`${count} pending tasks`}
              sx={{ height: 20, minWidth: 20, '& .MuiChip-label': { px: 0.75, fontSize: 11 } }}
            />
          ),
        }),
      },
    };
  };
  return data.map((section) => ({
    ...section,
    items: section.items.map((item) => annotate(item).item),
  }));
}
