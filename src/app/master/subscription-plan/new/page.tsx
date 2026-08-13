import type { Metadata } from 'next';

import { SubscriptionPlanCreateView } from 'src/sections/subscription-plan/view/subscription-plan-create-view';

export const metadata: Metadata = {
};

export default function Page() {
  return <SubscriptionPlanCreateView />;
}
