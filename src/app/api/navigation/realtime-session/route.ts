import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { canReviewLessonPlans } from 'src/lib/lesson-plan-access';
import { requireLessonPlanFeature } from 'src/lib/lesson-plan-feature-access';
import { canManageViaPermission } from 'src/lib/department-permission-access';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };

export async function GET(request: Request) {
  const caller = requireRole(request, ['school_admin', 'teacher', 'student']);
  if (!caller?.schoolId)
    return NextResponse.json({ message: 'Forbidden' }, { status: 403, headers });
  const { data: profile, error } = await supabaseAdmin
    .from('app_users')
    .select('id,school_id,role,is_active')
    .eq('id', caller.sub)
    .eq('school_id', caller.schoolId)
    .maybeSingle();
  if (error)
    return NextResponse.json({ message: 'Session verification failed' }, { status: 503, headers });
  if (!profile?.is_active || profile.role !== caller.role)
    return NextResponse.json({ message: 'Forbidden' }, { status: 403, headers });

  const [inventory, lessonCaller] = await Promise.all([
    caller.role !== 'student' && canManageViaPermission(caller, 'inventory.approve'),
    caller.role !== 'student'
      ? requireLessonPlanFeature(request, ['school_admin', 'teacher'])
      : null,
  ]);
  const lessons = lessonCaller && (await canReviewLessonPlans(lessonCaller, true));
  const topics = [
    `inbox:${caller.schoolId}:${caller.sub}`,
    `notifications:${caller.schoolId}`,
    ...(inventory ? [`tasks:${caller.schoolId}:inventory`] : []),
    ...(lessons ? [`tasks:${caller.schoolId}:lessons`] : []),
  ];
  const secret = process.env.SUPABASE_REALTIME_JWT_SECRET;
  if (!secret || topics.length === 0) return NextResponse.json({ enabled: false }, { headers });
  const expiresIn = Math.min(300, (caller.exp ?? 0) - Math.floor(Date.now() / 1000));
  if (expiresIn <= 0)
    return NextResponse.json({ message: 'Session expired' }, { status: 401, headers });
  const token = jwt.sign(
    {
      sub: caller.sub,
      role: 'task_realtime',
      aud: 'authenticated',
      school_id: caller.schoolId,
      task_topics: topics,
    },
    secret,
    { algorithm: 'HS256', expiresIn }
  );
  return NextResponse.json({ enabled: true, token, topics, expiresIn }, { headers });
}
