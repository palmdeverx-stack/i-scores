import { DocumentReservationView } from 'src/sections/documents/view/document-reservation-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="documents.access">
      <DocumentReservationView />
    </DepartmentPermissionGuard>
  );
}
