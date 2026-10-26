'use client';

import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';

import { CONFIG } from 'src/global-config';

import { useAuthContext } from 'src/auth/hooks';

export function useTaskNotifications() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const schoolId = user?.school_id;
  const role = user?.role;
  useEffect(() => {
    if (!userId || !schoolId || !['teacher', 'school_admin', 'student'].includes(role ?? ''))
      return undefined;
    let disposed = false;
    let client: ReturnType<typeof createClient> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const refresh = () => {
      if (disposed || refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = undefined;
        if (disposed) return;
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ['notifications', schoolId, userId] }),
          queryClient.invalidateQueries({ queryKey: ['navigation-task-counts', schoolId, userId] }),
          queryClient.invalidateQueries({ queryKey: ['inventory-purchases'] }),
          queryClient.invalidateQueries({ queryKey: ['school-inventory'] }),
          queryClient.invalidateQueries({ queryKey: ['lesson-plans'] }),
        ]);
      }, 200);
    };
    const connect = async () => {
      let renewIn = 60000;
      try {
        const response = await fetch('/api/navigation/realtime-session', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Realtime session unavailable');
        const session = (await response.json()) as {
          enabled: boolean;
          token?: string;
          topics?: string[];
          expiresIn?: number;
        };
        if (disposed) return;
        if (client) {
          await client.removeAllChannels();
          client.realtime.disconnect();
          client = undefined;
        }
        if (disposed) return;
        if (session.enabled && session.token && session.topics?.length) {
          // Isolated client: never replace the user's Supabase Auth session.
          client = createClient(CONFIG.supabase.url, CONFIG.supabase.key, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
          });
          await client.realtime.setAuth(session.token);
          if (disposed) {
            client.realtime.disconnect();
            return;
          }
          for (const topic of session.topics) {
            client
              .channel(topic, { config: { private: true } })
              .on('broadcast', { event: 'tasks.changed' }, refresh)
              .on('broadcast', { event: 'notifications.changed' }, refresh)
              .subscribe((status) => {
                if (status === 'SUBSCRIBED') refresh();
              });
          }
          renewIn = Math.max(1000, (session.expiresIn ?? 300) * 800);
        }
      } catch {
        // Existing periodic count refresh keeps the menu usable offline or
        // before the database migration and signing secret are configured.
      } finally {
        if (!disposed)
          timer = setTimeout(() => {
            void connect();
          }, renewIn);
      }
    };
    void connect();
    return () => {
      disposed = true;
      controller.abort();
      clearTimeout(timer);
      clearTimeout(refreshTimer);
      if (client) {
        void client.removeAllChannels();
        client.realtime.disconnect();
      }
    };
  }, [userId, schoolId, role, queryClient]);
}
