import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import {
  loadTeacherAssignment,
  canAccessTeacherAssignment,
} from 'src/lib/teacher-assignment-access';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };

const CATEGORY_ORDER = ['assignment', 'quiz', 'midterm', 'final', 'other'];

export async function GET(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['teacher', 'school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const teacherAssignment = await loadTeacherAssignment(id);
  if (!canAccessTeacherAssignment(caller, teacherAssignment)) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึงรายวิชานี้' }, { status: 403 });
  }

  const [{ data: assignments, error: assignmentError }, { data: enrollments, error: rosterError }] =
    await Promise.all([
      supabaseAdmin
        .from('assignments')
        .select('id, title, full_score, category, created_at')
        .eq('teacher_assignment_id', id)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('enrollments')
        .select(
          `id, student_number,
           student:app_users!enrollments_student_id_fkey!inner(
             id, username, first_name, last_name, nickname, student_code, school_id, role
           )`
        )
        .eq('classroom_id', teacherAssignment!.classroom_id)
        .eq('student.school_id', caller.schoolId)
        .eq('student.role', 'student')
        .order('student_number', { ascending: true, nullsFirst: false }),
    ]);

  if (assignmentError || rosterError) {
    return NextResponse.json(
      { message: assignmentError?.message ?? rosterError?.message },
      { status: 500 }
    );
  }

  const sortedAssignments = [...(assignments ?? [])].sort((left, right) => {
    const categoryDifference =
      CATEGORY_ORDER.indexOf(left.category) - CATEGORY_ORDER.indexOf(right.category);
    if (categoryDifference) return categoryDifference;
    return left.created_at.localeCompare(right.created_at);
  });
  const assignmentIds = sortedAssignments.map((assignment) => assignment.id);
  const { data: scores, error: scoreError } = assignmentIds.length
    ? await supabaseAdmin
        .from('scores')
        .select('assignment_id, student_id, score, status')
        .in('assignment_id', assignmentIds)
    : { data: [], error: null };

  if (scoreError) {
    return NextResponse.json({ message: scoreError.message }, { status: 500 });
  }

  const scoreByStudent = new Map<string, Map<string, (typeof scores)[number]>>();
  (scores ?? []).forEach((score) => {
    const studentScores = scoreByStudent.get(score.student_id) ?? new Map();
    studentScores.set(score.assignment_id, score);
    scoreByStudent.set(score.student_id, studentScores);
  });

  const students = (enrollments ?? []).flatMap((enrollment) => {
    const student = Array.isArray(enrollment.student) ? enrollment.student[0] : enrollment.student;
    if (!student) return [];

    const studentScores = scoreByStudent.get(student.id);
    return [
      {
        id: student.id,
        studentNumber: enrollment.student_number,
        studentCode: student.student_code,
        username: student.username,
        firstName: student.first_name,
        lastName: student.last_name,
        nickname: student.nickname,
        scores: Object.fromEntries(
          sortedAssignments.map((assignment) => {
            const score = studentScores?.get(assignment.id);
            return [
              assignment.id,
              {
                score: score?.score ?? null,
                status: score?.status ?? 'not_submitted',
              },
            ];
          })
        ),
      },
    ];
  });

  const classroom = teacherAssignment!.classrooms as unknown as {
    name: string;
    academic_years: { year: string } | null;
  };
  const subject = teacherAssignment!.subjects as unknown as {
    name: string;
    code: string | null;
  };
  const semester = teacherAssignment!.semesters as unknown as { name: string };

  return NextResponse.json({
    report: {
      teacherAssignmentId: id,
      subject: { name: subject?.name ?? '', code: subject?.code ?? null },
      classroom: {
        name: classroom?.name ?? '',
        academicYear: classroom?.academic_years?.year ?? null,
      },
      semesterName: semester?.name ?? null,
      assignments: sortedAssignments.map((assignment) => ({
        id: assignment.id,
        title: assignment.title,
        category: assignment.category,
        fullScore: Number(assignment.full_score),
      })),
      students,
    },
  });
}
