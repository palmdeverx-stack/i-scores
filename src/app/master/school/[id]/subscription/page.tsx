import type { Metadata } from 'next';

import { SchoolSubscriptionView } from 'src/sections/school-subscription/view/school-subscription-view';

export const metadata: Metadata = {
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <SchoolSubscriptionView schoolId={id} />;
}
