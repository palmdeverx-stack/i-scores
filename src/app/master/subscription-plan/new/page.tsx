import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { SubscriptionPlanCreateView } from 'src/sections/subscription-plan/view/subscription-plan-create-view';

export const metadata: Metadata = {
  title: `สร้างแพ็กเกจใหม่ | ${CONFIG.appName}`,
};

export default function Page() {
  return <SubscriptionPlanCreateView />;
}
