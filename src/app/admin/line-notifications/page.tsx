import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { LineNotificationSettingsView } from 'src/sections/line-notifications/view/line-notification-settings-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `แจ้งเตือน LINE - ${CONFIG.appName}` };

export default function Page() {
  return <LineNotificationSettingsView />;
}
