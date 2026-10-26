import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { canReviewLessonPlans } from 'src/lib/lesson-plan-access';
import { requireLessonPlanFeature } from 'src/lib/lesson-plan-feature-access';
import { canManageViaPermission } from 'src/lib/department-permission-access';

export async function GET(request: Request) {
  const caller = requireRole(request, ['school_admin', 'teacher']);
  if (!caller?.schoolId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  const approveInventory = await canManageViaPermission(caller, 'inventory.approve');
  const counts: Record<string, number> = {};
  const lessonCaller = await requireLessonPlanFeature(request, ['school_admin', 'teacher']);
  const reviewLessons = lessonCaller && (await canReviewLessonPlans(lessonCaller, true));
  const jobs: Promise<void>[] = [];
  const count = (
    path: string,
    table: string,
    statuses: string[],
    kind?: string,
    senderColumn = 'created_by'
  ) => {
    jobs.push(
      (async () => {
        let query = supabaseAdmin
          .from(table)
          .select('id', { count: 'exact', head: true })
          .eq('school_id', caller.schoolId!)
          .in('status', statuses)
          .neq(senderColumn, caller.sub);
        if (kind) query = query.eq('kind', kind);
        const result = await query;
        if (result.error) throw new Error('Task count unavailable');
        counts[path] = (counts[path] ?? 0) + (result.count ?? 0);
      })()
    );
  };
  if (approveInventory) {
    count('/inventory/purchase-approvals', 'inventory_purchases', ['submitted']);
    count('/inventory/approvals', 'inventory_documents', ['submitted'], 'issue');
  }
  if (reviewLessons) count('/lesson-plan-reviews', 'lesson_plans', ['submitted'], undefined, 'teacher_id');
  try {
    await Promise.all(jobs);
    return NextResponse.json({ counts }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ message: 'Task counts unavailable' }, { status: 503 });
  }
}
