import type { Metadata } from 'next';

import { SubscriptionPlanView } from 'src/sections/subscription-plan/view/subscription-plan-view';

export const metadata: Metadata = {
};

export default function Page() {
  return <SubscriptionPlanView />;
}
