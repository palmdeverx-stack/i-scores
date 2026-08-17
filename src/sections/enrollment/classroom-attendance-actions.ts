'use client';

export type ClassroomSubjectAttendanceStatus = 'present' | 'absent' | 'leave' | 'late';

export type ClassroomSubjectAttendanceRecord = {
  id: string;
  attendanceDate: string;
  periodKey: string;
  status: ClassroomSubjectAttendanceStatus;
  note: string | null;
  updatedAt: string;
  subject: { id: string; code: string | null; name: string };
  student: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    studentCode: string | null;
    avatarUrl: string | null;
  };
};

export type ClassroomSubjectAttendanceData = {
  records: ClassroomSubjectAttendanceRecord[];
  subjects: Array<{ id: string; code: string | null; name: string }>;
  total: number;
  page: number;
  pageSize: number;
};

export async function getClassroomSubjectAttendance(
  classroomId: string,
  filters: {
    semesterId: string;
    startDate: string;
    endDate: string;
    subjectId?: string;
    status?: ClassroomSubjectAttendanceStatus;
    search?: string;
    page: number;
    pageSize: number;
  }
): Promise<ClassroomSubjectAttendanceData> {
  const query = new URLSearchParams({
    semesterId: filters.semesterId,
    startDate: filters.startDate,
    endDate: filters.endDate,
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  });
  if (filters.subjectId) query.set('subjectId', filters.subjectId);
  if (filters.status) query.set('status', filters.status);
  if (filters.search) query.set('search', filters.search);

  const response = await fetch(`/api/admin/classrooms/${classroomId}/attendance?${query}`);
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถโหลดการเข้าเรียนรายวิชาได้');
  return json;
}
