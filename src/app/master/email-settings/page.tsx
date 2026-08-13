import type { Metadata } from 'next';

import { EmailSettingsView } from 'src/sections/email-settings/view';

export const metadata: Metadata = {
};

export default function Page() {
  return <EmailSettingsView />;
}
