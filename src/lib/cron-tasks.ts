import 'server-only';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { processGradeSubmissionReminders } from 'src/lib/grade-reminders';
import { processPendingLineNotifications } from 'src/lib/line-notifications';
import { processSchoolHolidayAnnouncements } from 'src/lib/school-holiday-announcements';

// ----------------------------------------------------------------------

export type DailyCronSlot = 'morning' | 'afternoon';

type CronTask = {
  name: string;
  run: () => Promise<unknown>;
};

type CronTaskResult = {
  name: string;
  status: 'fulfilled' | 'rejected';
  durationMs: number;
  result?: unknown;
  error?: string;
};

export async function processAllPendingLineNotifications() {
  const { data: integrations, error } = await supabaseAdmin
    .from('school_line_integrations')
    .select('school_id')
    .eq('is_enabled', true);

  if (error) throw error;

  let processedSchools = 0;
  const failedSchools: Array<{ schoolId: string; error: string }> = [];

  for (const integration of integrations ?? []) {
    try {
      await processPendingLineNotifications(integration.school_id);
      processedSchools += 1;
    } catch (taskError) {
      failedSchools.push({
        schoolId: integration.school_id,
        error: taskError instanceof Error ? taskError.message : 'Unknown LINE processing error',
      });
    }
  }

  if (failedSchools.length) {
    throw new Error(
      `LINE processing failed for ${failedSchools.length} school(s): ${JSON.stringify(failedSchools)}`
    );
  }

  return { processedSchools };
}

function tasksForSlot(slot: DailyCronSlot): CronTask[] {
  const tasks: CronTask[] = [
    {
      name: 'school-holiday-announcements',
      run: processSchoolHolidayAnnouncements,
    },
  ];

  if (slot === 'morning') {
    tasks.push({
      name: 'grade-submission-reminders',
      run: processGradeSubmissionReminders,
    });
  }

  tasks.push({
    name: 'line-notifications',
    run: processAllPendingLineNotifications,
  });

  return tasks;
}

/** Runs tasks sequentially and records each failure without stopping later tasks. */
export async function runDailyCron(slot: DailyCronSlot) {
  const results: CronTaskResult[] = [];

  for (const task of tasksForSlot(slot)) {
    const startedAt = Date.now();
    try {
      const result = await task.run();
      results.push({
        name: task.name,
        status: 'fulfilled',
        durationMs: Date.now() - startedAt,
        result,
      });
    } catch (taskError) {
      console.error(`Daily cron task failed: ${task.name}`, taskError);
      results.push({
        name: task.name,
        status: 'rejected',
        durationMs: Date.now() - startedAt,
        error: taskError instanceof Error ? taskError.message : 'Unknown cron task error',
      });
    }
  }

  return {
    slot,
    ok: results.every((result) => result.status === 'fulfilled'),
    completedAt: new Date().toISOString(),
    results,
  };
}
