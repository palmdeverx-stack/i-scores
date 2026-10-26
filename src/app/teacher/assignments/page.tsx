import { TeacherAssignmentListView } from 'src/sections/teacher-assignment/view/teacher-assignment-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="teaching.assignments">
      <TeacherAssignmentListView />
    </DepartmentPermissionGuard>
  );
}
