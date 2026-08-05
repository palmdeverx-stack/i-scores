import 'server-only';

import type { SessionRole, AppTokenPayload } from './auth-token';

import { requireRole } from './auth-token';
import { schoolHasFeature } from './school-subscription';

type LessonPlanRole = Extract<SessionRole, 'teacher' | 'school_admin'>;

export async function requireLessonPlanFeature<T extends LessonPlanRole>(
  request: Request,
  roles: T[]
): Promise<(AppTokenPayload & { role: T }) | null> {
  const caller = requireRole(request, roles);
  if (!caller?.schoolId) return null;

  const enabled = await schoolHasFeature(caller.schoolId, 'teacher.lesson_plans', {
    userId: caller.sub,
    role: caller.role,
  });

  return enabled ? caller : null;
}
