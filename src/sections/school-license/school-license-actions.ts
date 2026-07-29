'use client';

// ----------------------------------------------------------------------

export type SchoolLicenseData = {
  licenses: Array<{
    id: string;
    product_id: string;
    license_scope: 'school' | 'teacher';
    feature_keys: string[];
    seat_count: number;
    used_seats: number;
    starts_at: string;
    expires_at: string;
    status: 'active' | 'revoked';
    is_current: boolean;
    product: {
      id: string;
      title: string;
      title_en: string | null;
      cover_url: string | null;
    } | null;
  }>;
  assignments: Array<{
    id: string;
    license_id: string;
    teacher_id: string;
    assigned_at: string;
    revoked_at: string | null;
  }>;
  teachers: Array<{
    id: string;
    username: string;
    email: string | null;
    name_prefix: string | null;
    first_name: string | null;
    last_name: string | null;
    position_title: string | null;
    is_active: boolean;
    auth_user_id: string | null;
  }>;
  members: Array<{
    id: string;
    marketplace_user_id: string | null;
    membership_role: string;
    joined_at: string;
    user: {
      id: string;
      email: string;
      username: string;
      first_name: string | null;
      last_name: string | null;
      is_active: boolean;
      auth_user_id: string;
    } | null;
  }>;
  invitations: Array<{
    id: string;
    marketplace_user_id: string;
    invited_email: string;
    membership_role: string;
    expires_at: string;
    accepted_at: string | null;
    revoked_at: string | null;
    created_at: string;
    last_sent_at: string | null;
    email_delivery_status: 'pending' | 'sent' | 'failed';
    invitation_status: 'accepted' | 'revoked' | 'expired' | 'pending';
  }>;
};

export async function getSchoolLicenses(): Promise<SchoolLicenseData> {
  const response = await fetch('/api/admin/licenses');
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถโหลด License โรงเรียนได้');
  return json;
}

export async function assignTeacherLicense(params: {
  licenseId: string;
  teacherId: string;
}) {
  const response = await fetch('/api/admin/licenses/assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถมอบ License ได้');
  return json.assignment;
}

export async function revokeTeacherLicense(assignmentId: string) {
  const response = await fetch(`/api/admin/licenses/assignments/${assignmentId}`, {
    method: 'DELETE',
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถยกเลิก License ได้');
}
