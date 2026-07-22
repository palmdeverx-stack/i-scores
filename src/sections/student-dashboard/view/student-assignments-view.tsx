'use client';

import { useMemo } from 'react';

import { StudentAssignmentList } from '../components/student-assignment-list';
import { StudentSubmissionOverview } from '../components/student-submission-overview';
import {
  HeroStat,
  HeroStats,
  isSubmitted,
  SectionHeading,
  StudentPageState,
  StudentPageScaffold,
  useStudentDashboard,
} from './student-dashboard-shared';

// ----------------------------------------------------------------------

export function StudentAssignmentsView() {
  const { data, isLoading, isError, refetch } = useStudentDashboard('assignments');

  const overview = useMemo(() => {
    const assignments =
      data?.subjects.flatMap((item) =>
        item.assignments.map((assignment) => ({ ...assignment, subject: item.subject }))
      ) ?? [];
    const submitted = assignments.filter((assignment) => isSubmitted(assignment.status)).length;
    const totalScore = assignments.reduce(
      (total, assignment) => total + (assignment.score ?? 0),
      0
    );
    const totalFullScore = assignments
      .filter((assignment) => assignment.score !== null)
      .reduce((total, assignment) => total + assignment.full_score, 0);

    return {
      assignments,
      submitted,
      pending: assignments.length - submitted,
      progress: assignments.length ? (submitted / assignments.length) * 100 : 0,
      scorePercent: totalFullScore ? (totalScore / totalFullScore) * 100 : 0,
    };
  }, [data]);

  if (isLoading || isError || !data) {
    return <StudentPageState isLoading={isLoading} isError={isError || !data} onRetry={refetch} />;
  }

  return (
    <StudentPageScaffold
      data={data}
      section="assignments"
      stats={
        <HeroStats>
          <HeroStat icon="solar:list-bold" label="งานทั้งหมด" value={overview.assignments.length} />
          <HeroStat icon="solar:check-circle-bold" label="ส่งแล้ว" value={overview.submitted} />
          <HeroStat icon="solar:clock-circle-bold" label="ยังไม่ส่ง" value={overview.pending} />
        </HeroStats>
      }
    >
      <StudentSubmissionOverview
        total={overview.assignments.length}
        submitted={overview.submitted}
        pending={overview.pending}
        progress={overview.progress}
        scorePercent={overview.scorePercent}
      />

      <SectionHeading
        icon="solar:list-bold"
        title="การส่งงาน"
        subtitle="ค้นหา กรองสถานะ และติดตามคะแนนของแต่ละรายวิชา"
      />
      <StudentAssignmentList assignments={overview.assignments} generatedAt={data.generated_at} />
    </StudentPageScaffold>
  );
}
