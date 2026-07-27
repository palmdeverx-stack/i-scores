import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DepartmentPermissionGuard permission="teaching.students">
      {children}
    </DepartmentPermissionGuard>
  );
}
