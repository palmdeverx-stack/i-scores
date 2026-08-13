'use client';

import { useQuery } from '@tanstack/react-query';

import { getSystemUiSettings } from './system-ui-settings-actions';

// ----------------------------------------------------------------------

export const SYSTEM_UI_SETTINGS_QUERY_KEY = ['system-ui-settings'] as const;

export function useSystemUiSettings(enabled = true) {
  return useQuery({
    queryKey: SYSTEM_UI_SETTINGS_QUERY_KEY,
    queryFn: getSystemUiSettings,
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: 'always',
  });
}
