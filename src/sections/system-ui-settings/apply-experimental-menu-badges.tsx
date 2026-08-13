'use client';

import type { NavMainProps } from 'src/layouts/main/nav/types';
import type { NavSectionProps, NavItemDataProps } from 'src/components/nav-section';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

function experimentalBadge() {
  return (
    <Label color="warning" sx={{ height: 20, px: 0.75, fontSize: 10, whiteSpace: 'nowrap' }}>
      เวอร์ชันทดลอง
    </Label>
  );
}

function decorateRootDashboardItems(
  items: NavItemDataProps[],
  experimentalPaths: Set<string>
): NavItemDataProps[] {
  return items.map((item) => ({
    ...item,
    ...(experimentalPaths.has(item.path) && { info: experimentalBadge() }),
  }));
}

export function applyDashboardExperimentalBadges(
  data: NavSectionProps['data'],
  experimentalMenuPaths: string[]
): NavSectionProps['data'] {
  const experimentalPaths = new Set(experimentalMenuPaths);
  return data.map((group) => ({
    ...group,
    items: decorateRootDashboardItems(group.items, experimentalPaths),
  }));
}

export function applyMainExperimentalBadges(
  data: NavMainProps['data'],
  experimentalMenuPaths: string[]
): NavMainProps['data'] {
  const experimentalPaths = new Set(experimentalMenuPaths);
  return data.map((item) => ({
    ...item,
    ...(experimentalPaths.has(item.path) && { info: experimentalBadge() }),
  }));
}
