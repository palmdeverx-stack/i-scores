import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

const ROLE_HOME_PATHS: Record<string, string> = {
  master_admin: paths.master.root,
  school_admin: paths.admin.root,
  teacher: paths.teacher.root,
  student: paths.student.root,
};

export function getHomePathForRole(role?: string): string {
  return (role && ROLE_HOME_PATHS[role]) || paths.auth.jwt.signIn;
}
