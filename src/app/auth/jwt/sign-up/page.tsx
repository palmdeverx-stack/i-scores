import type { Metadata } from 'next';

import { JwtSignUpView } from 'src/auth/view/jwt';

// ----------------------------------------------------------------------

export default function Page() {
  return <JwtSignUpView />;
}
