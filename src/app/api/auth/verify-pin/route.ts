import { verifyStaffPinRequest } from 'src/lib/verify-staff-pin';

export async function POST(request: Request) {
  return verifyStaffPinRequest(request);
}
