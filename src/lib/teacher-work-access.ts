import 'server-only';

import type { AppTokenPayload } from './auth-token';
import type { DepartmentPermissionKey } from './department-permissions-config';

import {
  getDepartmentGrantedPermissions,
  getEffectiveDepartmentPermissions,
} from './department-permission-access';

type Requirement = { any: DepartmentPermissionKey[]; access: 'view' | 'manage' };
export function teacherWorkRequirement(url: URL, method: string): Requirement | null {
  const path = url.pathname.replace(/\/$/, '');
  const access = ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase()) ? 'view' : 'manage';
  if (path.startsWith('/api/teacher/attendance-scan'))
    return { any: ['teaching.attendance'], access };
  if (path.startsWith('/api/teacher/timetable')) return { any: ['teaching.timetable'], access };
  if (path.startsWith('/api/teacher/announcements'))
    return { any: ['teaching.announcements', 'announcements.manage'], access };
  if (path === '/api/teacher-assignments' || path === '/api/teacher-assignments/summary')
    return {
      any:
        access === 'view'
          ? ['teaching.assignments', 'teaching.attendance', 'schedule.manage']
          : ['teaching.assignments', 'schedule.manage'],
      access,
    };
  if (path.startsWith('/api/teacher-assignments/')) {
    if (/^\/api\/teacher-assignments\/[^/]+$/.test(path))
      return { any: ['teaching.assignments', 'schedule.manage'], access };
    if (/\/attendance(?:\/|$)/.test(path)) return { any: ['teaching.attendance'], access };
    if (/\/schedules(?:\/|$)/.test(path))
      return { any: ['teaching.assignments', 'schedule.manage'], access };
    if (/\/(roster|students)(?:\/|$)/.test(path))
      return {
        any:
          access === 'view'
            ? ['teaching.assignments', 'teaching.students']
            : ['teaching.assignments'],
        access,
      };
    return { any: ['teaching.assignments'], access };
  }
  if (path.startsWith('/api/assignments/')) return { any: ['teaching.assignments'], access };
  if (path === '/api/lesson-plans' || path.startsWith('/api/lesson-plans/')) {
    // Status transitions distinguish owner submit/archive from review actions
    // in the route handler itself; they must not borrow each other's rights.
    if (path.endsWith('/status')) return null;
    if (path === '/api/lesson-plans' && access === 'view')
      return {
        any:
          url.searchParams.get('scope') === 'review'
            ? ['lesson_plans.review']
            : ['teaching.assignments'],
        access,
      };
    return {
      any:
        access === 'view'
          ? ['teaching.assignments', 'lesson_plans.review']
          : ['teaching.assignments'],
      access,
    };
  }
  return null;
}
/** Additional capability gate. Original role, school, ownership and feature
 * checks in each handler still apply; no broader scope is granted here. */
export async function canAccessTeacherWork(request: Request, caller: AppTokenPayload | null) {
  if (caller?.role !== 'teacher') return true;
  const required = teacherWorkRequirement(new URL(request.url), request.method);
  if (!required) return true;
  if (!caller.schoolId) return false;
  const keys =
    required.access === 'manage'
      ? await getEffectiveDepartmentPermissions(caller.sub, caller.schoolId)
      : await getDepartmentGrantedPermissions(caller.sub, caller.schoolId);
  return required.any.some((key) => keys.includes(key));
}
