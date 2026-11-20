type StudentImportIdentity = {
  studentCode?: string;
  username?: string;
};

export function getStudentImportUsername({ username, studentCode }: StudentImportIdentity) {
  const code = studentCode?.trim();
  return username?.trim() || (code ? `EKRU${code}` : '');
}

export function getStudentImportIdentityErrors(rows: StudentImportIdentity[]): string[][] {
  const codes = new Map<string, number>();
  const usernames = new Map<string, number>();
  const identities = rows.map((row) => ({
    studentCode: row.studentCode?.trim().toLowerCase() ?? '',
    username: getStudentImportUsername(row).toLowerCase(),
  }));

  for (const { studentCode, username } of identities) {
    if (studentCode) codes.set(studentCode, (codes.get(studentCode) ?? 0) + 1);
    if (username) usernames.set(username, (usernames.get(username) ?? 0) + 1);
  }

  return identities.map(({ studentCode, username }) => {
    const errors: string[] = [];
    if (!studentCode) errors.push('ไม่มีรหัสนักเรียน');
    else if ((codes.get(studentCode) ?? 0) > 1) errors.push('รหัสนักเรียนซ้ำในไฟล์');
    if ((usernames.get(username) ?? 0) > 1) errors.push('ชื่อผู้ใช้งานซ้ำในไฟล์');
    return errors;
  });
}
