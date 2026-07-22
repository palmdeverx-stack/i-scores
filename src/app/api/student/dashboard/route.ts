import { NextResponse } from 'next/server';

import { today, fIsBetween } from 'src/utils/format-time';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

type Person = {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

type AcademicYear = {
  id: string;
  year: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
};
type Classroom = {
  id: string;
  name: string;
  grade_level: string | null;
  academic_year: AcademicYear | null;
};

export async function GET(request: Request) {
  const generatedAt = new Date().toISOString();
  const caller = requireRole(request, ['student']);
  const requestedSection = new URL(request.url).searchParams.get('section');
  const section = ['home', 'classroom', 'subjects', 'assignments'].includes(requestedSection ?? '')
    ? requestedSection
    : 'home';

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const [{ data: student, error: studentError }, { data: enrollmentRows, error: enrollmentError }] =
    await Promise.all([
      supabaseAdmin
        .from('app_users')
        .select('id, username, first_name, last_name, avatar_url')
        .eq('id', caller.sub)
        .maybeSingle(),
      supabaseAdmin
        .from('enrollments')
        .select(
          `id, student_number, classroom_id,
           classroom:classrooms(id, name, grade_level, academic_year:academic_years(id, year, is_active, start_date, end_date))`
        )
        .eq('student_id', caller.sub)
        .order('created_at', { ascending: false }),
    ]);

  if (studentError || enrollmentError) {
    return NextResponse.json(
      { message: studentError?.message ?? enrollmentError?.message },
      { status: 500 }
    );
  }

  if (!student) {
    return NextResponse.json({ message: 'ไม่พบข้อมูลนักเรียน' }, { status: 404 });
  }

  const enrollments = enrollmentRows.map((row) => ({
    id: row.id,
    student_number: row.student_number,
    classroom: row.classroom as unknown as Classroom,
  }));
  const classroomIds = Array.from(
    new Set(enrollments.map((row) => row.classroom?.id).filter(Boolean))
  );
  const currentEnrollment =
    enrollments.find((row) =>
      fIsBetween(
        today(),
        row.classroom?.academic_year?.start_date,
        row.classroom?.academic_year?.end_date
      )
    ) ?? enrollments[0];

  const { data: announcementRows, error: announcementError } =
    section === 'home' && caller.schoolId
      ? await supabaseAdmin
          .from('school_announcements')
          .select(
            `id, title, content, priority, announcement_type, published_at, expires_at,
             event_start, event_end, targets:announcement_classrooms(classroom_id)`
          )
          .eq('school_id', caller.schoolId)
          .eq('is_published', true)
          .lte('published_at', new Date().toISOString())
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order('published_at', { ascending: false })
          .limit(10)
      : { data: [], error: null };

  if (announcementError) {
    return NextResponse.json({ message: announcementError.message }, { status: 500 });
  }

  const currentClassroomId = currentEnrollment?.classroom?.id;
  const visibleAnnouncements = announcementRows.filter((announcement) => {
    const targets = announcement.targets as unknown as Array<{ classroom_id: string }>;
    return !targets.length || targets.some((target) => target.classroom_id === currentClassroomId);
  });

  if (!classroomIds.length) {
    return NextResponse.json({
      generated_at: generatedAt,
      student,
      enrollments,
      subjects: [],
      schedules: [],
      class_members: [],
      homeroom_teachers: [],
      ranking: [],
      subject_rankings: [],
      announcements: visibleAnnouncements,
    });
  }

  if (section === 'classroom') {
    const [
      { data: classmateRows, error: classmateError },
      { data: homeroomRows, error: homeroomError },
    ] = await Promise.all([
      supabaseAdmin
        .from('enrollments')
        .select(
          `student_number,
             student:app_users!enrollments_student_id_fkey(id, username, first_name, last_name, avatar_url)`
        )
        .eq('classroom_id', currentEnrollment!.classroom.id)
        .order('student_number'),
      supabaseAdmin
        .from('classroom_homeroom_teachers')
        .select(
          'teacher:app_users!classroom_homeroom_teachers_teacher_id_fkey(id, username, first_name, last_name, avatar_url)'
        )
        .eq('classroom_id', currentEnrollment!.classroom.id),
    ]);

    if (classmateError || homeroomError) {
      return NextResponse.json(
        { message: classmateError?.message ?? homeroomError?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      generated_at: generatedAt,
      student,
      enrollments,
      subjects: [],
      schedules: [],
      class_members: classmateRows.map((row) => ({
        student: row.student as unknown as Person,
        student_number: row.student_number,
        is_current_student: (row.student as unknown as Person).id === caller.sub,
      })),
      homeroom_teachers: homeroomRows.map((row) => row.teacher as unknown as Person),
      ranking: [],
      subject_rankings: [],
      announcements: [],
    });
  }

  const { data: teachingRows, error: teachingError } = await supabaseAdmin
    .from('teacher_assignments')
    .select(
      `id, classroom_id,
       teacher:app_users!teacher_assignments_teacher_id_fkey(id, username, first_name, last_name, avatar_url),
       subject:subjects(id, code, name, credits, description, image_url),
       semester:semesters(id, name, start_date, end_date, is_active),
       classroom:classrooms(id, name, grade_level, academic_year:academic_years(id, year, is_active))`
    )
    .in('classroom_id', classroomIds)
    .order('created_at');

  if (teachingError) {
    return NextResponse.json({ message: teachingError.message }, { status: 500 });
  }

  const teachingIds = teachingRows.map((row) => row.id);
  const [
    { data: assignmentRows, error: assignmentError },
    { data: scheduleRows, error: scheduleError },
  ] = teachingIds.length
    ? await Promise.all([
        supabaseAdmin
          .from('assignments')
          .select(
            `id, teacher_assignment_id, title, description, full_score, due_at, category, created_at,
             attachments:assignment_attachments(id, file_name, file_url, mime_type, file_size, created_at)`
          )
          .in('teacher_assignment_id', teachingIds)
          .order('created_at', { ascending: false }),
        section === 'subjects'
          ? supabaseAdmin
              .from('teaching_schedules')
              .select('id, teacher_assignment_id, day_of_week, start_time, end_time')
              .in('teacher_assignment_id', teachingIds)
              .order('day_of_week')
              .order('start_time')
          : Promise.resolve({ data: [], error: null }),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (assignmentError || scheduleError) {
    return NextResponse.json(
      { message: assignmentError?.message ?? scheduleError?.message },
      { status: 500 }
    );
  }

  const assignmentIds = assignmentRows.map((assignment) => assignment.id);
  const { data: scoreRows, error: scoreError } =
    assignmentIds.length && section !== 'home'
      ? await supabaseAdmin
          .from('scores')
          .select('assignment_id, score, feedback, status, updated_at')
          .eq('student_id', caller.sub)
          .in('assignment_id', assignmentIds)
      : { data: [], error: null };

  if (scoreError) {
    return NextResponse.json({ message: scoreError.message }, { status: 500 });
  }

  const scoreByAssignmentId = new Map(scoreRows.map((score) => [score.assignment_id, score]));
  const subjects = teachingRows.map((teaching) => ({
    id: teaching.id,
    teacher: teaching.teacher as unknown as Person,
    subject: teaching.subject,
    semester: teaching.semester,
    classroom: teaching.classroom as unknown as Classroom,
    assignments: assignmentRows
      .filter((assignment) => assignment.teacher_assignment_id === teaching.id)
      .map((assignment) => {
        const score = scoreByAssignmentId.get(assignment.id);

        return {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          full_score: Number(assignment.full_score),
          due_at: assignment.due_at,
          category: assignment.category,
          created_at: assignment.created_at,
          attachments: assignment.attachments,
          score: score?.score === null || score?.score === undefined ? null : Number(score.score),
          feedback: score?.feedback ?? null,
          status: score?.status ?? 'not_submitted',
          updated_at: score?.updated_at ?? null,
        };
      }),
  }));

  const subjectByTeachingId = new Map(
    subjects.map((subject) => [
      subject.id,
      {
        subject: subject.subject,
        classroom: subject.classroom,
        teacher: subject.teacher,
      },
    ])
  );
  const schedules = scheduleRows.map((schedule) => ({
    ...schedule,
    ...subjectByTeachingId.get(schedule.teacher_assignment_id),
  }));

  const currentTeachingIds = teachingRows
    .filter((teaching) => teaching.classroom_id === currentEnrollment?.classroom.id)
    .map((teaching) => teaching.id);
  const currentAssignments = assignmentRows.filter((assignment) =>
    currentTeachingIds.includes(assignment.teacher_assignment_id)
  );
  const currentAssignmentIds = currentAssignments.map((assignment) => assignment.id);

  const [classmateResult, rankingScoreResult, homeroomResult] =
    section === 'home' && currentEnrollment
      ? await Promise.all([
          supabaseAdmin
            .from('enrollments')
            .select(
              `student_number,
             student:app_users!enrollments_student_id_fkey(id, username, first_name, last_name, avatar_url)`
            )
            .eq('classroom_id', currentEnrollment.classroom.id)
            .order('student_number'),
          currentAssignmentIds.length
            ? supabaseAdmin
                .from('scores')
                .select('student_id, assignment_id, score')
                .in('assignment_id', currentAssignmentIds)
            : Promise.resolve({ data: [], error: null }),
          supabaseAdmin
            .from('classroom_homeroom_teachers')
            .select(
              'teacher:app_users!classroom_homeroom_teachers_teacher_id_fkey(id, username, first_name, last_name, avatar_url)'
            )
            .eq('classroom_id', currentEnrollment.classroom.id),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ];

  if (classmateResult.error || rankingScoreResult.error || homeroomResult.error) {
    return NextResponse.json(
      {
        message:
          classmateResult.error?.message ??
          rankingScoreResult.error?.message ??
          homeroomResult.error?.message,
      },
      { status: 500 }
    );
  }

  const classMembers = classmateResult.data.map((row) => ({
    student: row.student as unknown as Person,
    student_number: row.student_number,
    is_current_student: (row.student as unknown as Person).id === caller.sub,
  }));
  const homeroomTeachers = homeroomResult.data.map((row) => row.teacher as unknown as Person);

  const buildRanking = (rankAssignments: typeof currentAssignments) => {
    const assignmentIdSet = new Set(rankAssignments.map((assignment) => assignment.id));
    const totalFullScore = rankAssignments.reduce(
      (total, assignment) => total + Number(assignment.full_score),
      0
    );
    const scoreByStudentId = new Map<string, number>();

    rankingScoreResult.data
      .filter((score) => assignmentIdSet.has(score.assignment_id))
      .forEach((score) => {
        scoreByStudentId.set(
          score.student_id,
          (scoreByStudentId.get(score.student_id) ?? 0) + Number(score.score)
        );
      });

    let previousScore: number | null = null;
    let previousRank = 0;

    return classmateResult.data
      .map((row) => {
        const classmate = row.student as unknown as Person;
        const score = scoreByStudentId.get(classmate.id) ?? 0;

        return {
          student: classmate,
          student_number: row.student_number,
          score,
          full_score: totalFullScore,
          percentage: totalFullScore ? (score / totalFullScore) * 100 : 0,
          is_current_student: classmate.id === caller.sub,
        };
      })
      .sort(
        (a, b) =>
          b.percentage - a.percentage || a.student.username.localeCompare(b.student.username)
      )
      .map((row, index) => {
        if (previousScore === null || row.percentage !== previousScore) {
          previousRank = index + 1;
          previousScore = row.percentage;
        }

        return { ...row, rank: previousRank };
      });
  };

  const ranking = buildRanking(currentAssignments);
  const subjectRankings = teachingRows
    .filter((teaching) => currentTeachingIds.includes(teaching.id))
    .map((teaching) => ({
      id: teaching.id,
      subject: teaching.subject,
      semester: teaching.semester,
      ranking: buildRanking(
        currentAssignments.filter((assignment) => assignment.teacher_assignment_id === teaching.id)
      ),
    }));

  if (section === 'home') {
    return NextResponse.json({
      generated_at: generatedAt,
      student,
      enrollments,
      subjects: [],
      schedules: [],
      class_members: classMembers,
      homeroom_teachers: homeroomTeachers,
      ranking,
      subject_rankings: subjectRankings,
      announcements: visibleAnnouncements,
    });
  }

  if (section === 'subjects') {
    return NextResponse.json({
      generated_at: generatedAt,
      student,
      enrollments,
      subjects,
      schedules,
      class_members: [],
      homeroom_teachers: [],
      ranking: [],
      subject_rankings: [],
      announcements: [],
    });
  }

  return NextResponse.json({
    generated_at: generatedAt,
    student,
    enrollments,
    subjects,
    schedules: [],
    class_members: [],
    homeroom_teachers: [],
    ranking: [],
    subject_rankings: [],
    announcements: [],
  });
}
