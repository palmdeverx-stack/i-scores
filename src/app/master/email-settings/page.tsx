import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { EmailSettingsView } from 'src/sections/email-settings/view';

export const metadata: Metadata = {
  title: `ตั้งค่าการส่งอีเมล | ${CONFIG.appName}`,
};

export default function Page() {
  return <EmailSettingsView />;
}
