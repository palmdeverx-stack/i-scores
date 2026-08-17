import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

const MY_DUTY_SELECT = `
  id,
  schedule:school_duty_schedules!inner(
    id, duty_date, shift, starts_at, ends_at, location, note, created_at,
    recurrence_group_id, recurrence_weekdays, recurrence_until,
    assignees:school_duty_assignees(
      id, staff_id,
      staff:app_users!school_duty_assignees_staff_id_fkey(
        id, username, first_name, last_name, avatar_url
      )
    )
  )
`;

export async function GET(request: Request) {
  const caller = requireRole(request, ['teacher']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const searchParams = new URL(request.url).searchParams;
  const calendarMode = searchParams.get('mode') === 'calendar';
  const requestedPage = Number(searchParams.get('page') ?? 0);
  const page = Number.isInteger(requestedPage) && requestedPage >= 0 ? requestedPage : 0;
  const requestedPageSize = Number(searchParams.get('pageSize') ?? 20);
  const pageSize = calendarMode
    ? 500
    : Math.min(
        50,
        Number.isInteger(requestedPageSize) && requestedPageSize > 0 ? requestedPageSize : 20
      );
  const from = page * pageSize;

  const { data, error } = await supabaseAdmin
    .from('school_duty_assignees')
    .select(MY_DUTY_SELECT)
    .eq('staff_id', caller.sub)
    .eq('schedule.school_id', caller.schoolId)
    .order('duty_date', { referencedTable: 'school_duty_schedules', ascending: true })
    .order('starts_at', { referencedTable: 'school_duty_schedules', ascending: true })
    .range(from, from + pageSize - 1);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const schedules = (data ?? [])
    .flatMap((assignment) =>
      Array.isArray(assignment.schedule)
        ? assignment.schedule
        : assignment.schedule
          ? [assignment.schedule]
          : []
    )
    .sort((left, right) =>
      `${left.duty_date}T${left.starts_at}`.localeCompare(`${right.duty_date}T${right.starts_at}`)
    );

  return NextResponse.json({
    schedules,
    nextPage: !calendarMode && schedules.length === pageSize ? page + 1 : null,
  });
}
