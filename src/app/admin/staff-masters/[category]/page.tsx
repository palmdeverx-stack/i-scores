import type { Metadata } from 'next';
import type { StaffMasterCategory } from 'src/sections/staff-master/staff-master-actions';

import { notFound } from 'next/navigation';

import { CONFIG } from 'src/global-config';

import { StaffMasterListView } from 'src/sections/staff-master/view/staff-master-list-view';

// ----------------------------------------------------------------------

const CATEGORY_MAP: Record<string, { category: StaffMasterCategory; title: string }> = {
  'staff-types': { category: 'staff_type', title: 'ประเภทบุคลากร' },
  positions: { category: 'position', title: 'ตำแหน่ง' },
  'academic-ranks': { category: 'academic_rank', title: 'วิทยฐานะ' },
};

type Props = {
  params: Promise<{ category: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const config = CATEGORY_MAP[category];
  return { title: `${config?.title ?? 'ข้อมูลหลักบุคลากร'} - ${CONFIG.appName}` };
}

export default async function Page({ params }: Props) {
  const { category } = await params;
  const config = CATEGORY_MAP[category];
  if (!config) notFound();

  return <StaffMasterListView initialCategory={config.category} />;
}
