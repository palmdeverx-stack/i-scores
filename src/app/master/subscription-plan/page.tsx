import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { SubscriptionPlanView } from 'src/sections/subscription-plan/view/subscription-plan-view';

export const metadata: Metadata = {
  title: `ตั้งค่าแพ็กเกจ | ${CONFIG.appName}`,
};

export default function Page() {
  return <SubscriptionPlanView />;
}
