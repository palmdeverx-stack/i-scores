import type { Metadata } from 'next';

import { NotFoundView } from 'src/sections/error';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
};

export default function Page() {
  return <NotFoundView />;
}
