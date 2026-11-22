import type { SalesParty } from 'src/sections/sales-documents/sales-seller-schema';

import { z } from 'zod';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

import { salesSignatureInputSchema } from 'src/sections/sales-documents/sales-signature-schema';
import { salesDocumentLogoSchema } from 'src/sections/sales-documents/sales-document-logo-schema';
import {
  salesPartyLabel,
  salesPartySchema,
} from 'src/sections/sales-documents/sales-seller-schema';

const partyFields = (party: SalesParty) =>
  party === 'customer'
    ? 'id, name, address, tax_id, is_active, updated_at, school_id, document_email'
    : 'id, name, address, tax_id, is_active, updated_at, signature_image';
const privateHeaders = { 'Cache-Control': 'private, no-store' };
const partySchema = z.enum(['seller', 'customer']);
const platformStoreLinkTable = 'master_sales_platform_store_links';
const officialSignatureTable = 'master_sales_official_seller_signatures';
const officialSignatureWriteSchema = salesSignatureInputSchema.extend({
  source: z.enum(['marketplace', 'platform']),
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/i),
  revision: z.iso.datetime({ offset: true }).nullable(),
});

function getParty(request: Request) {
  return partySchema.safeParse(new URL(request.url).searchParams.get('party') ?? 'seller');
}

function partyTable(party: SalesParty) {
  return supabaseAdmin.from(
    party === 'customer' ? 'master_sales_customers' : 'master_sales_sellers'
  );
}

type LocalPartyRow = {
  id: string;
  name: string;
  address: string;
  tax_id: string;
  is_active: boolean;
  school_id?: string | null;
  document_email?: string;
  signature_image?: string;
  updated_at: string;
};

function localParty(row: LocalPartyRow) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    taxId: row.tax_id,
    isActive: row.is_active,
    updatedAt: row.updated_at,
    schoolId: row.school_id ?? null,
    documentEmail: row.document_email,
    signatureImage: row.signature_image,
    source: 'local',
  };
}

function getPlatformProvider() {
  return supabaseAdmin
    .from('marketplace_provider_settings')
    .select(
      'id, document_issuer_name, document_tax_address, company_name, first_name, last_name, brand_name, address, tax_id, logo_url, transparent_logo_url, updated_at'
    )
    .order('updated_at', { ascending: false })
    .order('id')
    .limit(1)
    .maybeSingle();
}

type PlatformProvider = NonNullable<Awaited<ReturnType<typeof getPlatformProvider>>['data']>;

function platformLogo(provider: PlatformProvider | null) {
  return (
    salesDocumentLogoSchema.safeParse(provider?.transparent_logo_url).data ??
    salesDocumentLogoSchema.safeParse(provider?.logo_url).data
  );
}

export async function GET(request: Request) {
  if (!requireRole(request, ['master_admin'])) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ดูข้อมูลคู่ค้า' }, { status: 403 });
  }
  const selection = getParty(request);
  if (!selection.success) {
    return NextResponse.json({ message: 'ประเภทคู่ค้าไม่ถูกต้อง' }, { status: 400 });
  }
  const party = selection.data;
  const label = salesPartyLabel[party];
  const view = new URL(request.url).searchParams.get('view');
  if (party === 'seller' && view === 'branding') {
    const { data, error } = await getPlatformProvider();
    if (error) return NextResponse.json({ message: 'โหลดโลโก้ระบบไม่สำเร็จ' }, { status: 500 });
    const logoUrl = platformLogo(data) ?? null;
    return NextResponse.json({ logoUrl }, { headers: privateHeaders });
  }
  if (party === 'customer' && view === 'schools') {
    const schools = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabaseAdmin
        .from('schools')
        .select('id, name, code')
        .eq('workspace_type', 'school')
        .order('name')
        .order('id')
        .range(offset, offset + pageSize - 1);
      if (error)
        return NextResponse.json({ message: 'โหลดรายชื่อโรงเรียนไม่สำเร็จ' }, { status: 500 });
      schools.push(...data);
      if (data.length < pageSize) break;
    }
    return NextResponse.json({ schools }, { headers: privateHeaders });
  }
  const [local, marketplace, provider, signatures, links] = await Promise.all([
    partyTable(party)
      .select(partyFields(party))
      .order('name')
      .order('id')
      .overrideTypes<LocalPartyRow[], { merge: false }>(),
    party === 'customer'
      ? { data: [], error: null }
      : supabaseAdmin
          .from('marketplace_sellers')
          .select('id, display_name, company_name, company_tax_id, business_address, logo_url')
          .eq('owner_role', 'master_admin')
          .eq('status', 'active')
          .order('display_name')
          .order('id'),
    party === 'seller' ? getPlatformProvider() : { data: null, error: null },
    party === 'seller'
      ? supabaseAdmin
          .from(officialSignatureTable)
          .select('source, seller_id, signature_image, updated_at')
      : { data: [], error: null },
    party === 'seller'
      ? supabaseAdmin.from(platformStoreLinkTable).select('platform_id, marketplace_seller_id')
      : { data: [], error: null },
  ]);
  if (local.error || marketplace.error || signatures.error || links.error) {
    return NextResponse.json({ message: `โหลดข้อมูล${label}ไม่สำเร็จ` }, { status: 500 });
  }

  if (provider.error)
    console.error('Could not load platform issuer for sales documents', provider.error.code);
  const signaturesBySeller = new Map(
    (signatures.data ?? []).map(
      (record) => [`${record.source}:${record.seller_id}`, record] as const
    )
  );
  const platform = provider.data;
  const linkedStoreId = (links.data ?? []).find(
    (link) => link.platform_id === String(platform?.id)
  )?.marketplace_seller_id;
  const linkedStore = (marketplace.data ?? []).find((store) => String(store.id) === linkedStoreId);
  const linkedSignature = linkedStore && signaturesBySeller.get(`marketplace:${linkedStore.id}`);
  const platformSignature = platform && signaturesBySeller.get(`platform:${platform.id}`);
  const platformSeller = platform && {
    id: String(platform.id),
    name:
      platform.document_issuer_name?.trim() ||
      platform.company_name?.trim() ||
      [platform.first_name?.trim(), platform.last_name?.trim()].filter(Boolean).join(' ') ||
      platform.brand_name?.trim() ||
      'E-KRU',
    address: platform.document_tax_address?.trim() || platform.address?.trim() || '',
    taxId: platform.tax_id?.trim() ?? linkedStore?.company_tax_id?.trim() ?? '',
    logoUrl: platformLogo(platform),
    isActive: true,
    updatedAt: platformSignature?.updated_at ?? null,
    signatureImage: platformSignature?.signature_image ?? linkedSignature?.signature_image,
    platformRevision: platform.updated_at,
    platformLogoUrl: salesDocumentLogoSchema.safeParse(platform.logo_url).data,
    platformTransparentLogoUrl: salesDocumentLogoSchema.safeParse(platform.transparent_logo_url)
      .data,
    source: 'platform',
  };

  const official = (marketplace.data ?? [])
    .filter((row) => String(row.id) !== linkedStoreId)
    .map((row) => ({
      id: String(row.id),
      name: row.company_name?.trim() || row.display_name?.trim() || 'E-KRU',
      address: row.business_address ?? '',
      taxId: row.company_tax_id ?? '',
      logoUrl: salesDocumentLogoSchema.safeParse(row.logo_url).data,
      isActive: true,
      updatedAt: signaturesBySeller.get(`marketplace:${row.id}`)?.updated_at ?? null,
      signatureImage: signaturesBySeller.get(`marketplace:${row.id}`)?.signature_image,
      source: 'marketplace',
    }));
  return NextResponse.json(
    {
      sellers: [
        ...(platformSeller ? [platformSeller] : []),
        ...official,
        ...(local.data ?? []).map(localParty),
      ],
    },
    { headers: privateHeaders }
  );
}

async function saveOfficialSignature(request: Request) {
  const parsed = officialSignatureWriteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'ข้อมูลลายเซ็นไม่ถูกต้อง' },
      { status: 400 }
    );
  }

  const { id, source, revision, signatureImage } = parsed.data;
  const seller =
    source === 'platform'
      ? await getPlatformProvider()
      : await supabaseAdmin
          .from('marketplace_sellers')
          .select('id')
          .eq('id', id)
          .eq('owner_role', 'master_admin')
          .eq('status', 'active')
          .maybeSingle();
  if (seller.error)
    return NextResponse.json({ message: 'ตรวจสอบผู้ขายไม่สำเร็จ' }, { status: 500 });
  if (!seller.data || String(seller.data.id) !== id) {
    return NextResponse.json({ message: 'ไม่พบผู้ขายที่เลือก' }, { status: 404 });
  }

  const table = supabaseAdmin.from(officialSignatureTable);
  const { data, error } = revision
    ? await table
        .update({ signature_image: signatureImage })
        .match({ source, seller_id: id, updated_at: revision })
        .select('updated_at')
        .maybeSingle()
    : await table
        .insert({ source, seller_id: id, signature_image: signatureImage })
        .select('updated_at')
        .single();
  if (error && error.code !== '23505') {
    return NextResponse.json({ message: 'บันทึกลายเซ็นไม่สำเร็จ' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { message: 'ลายเซ็นถูกแก้ไขแล้ว กรุณาโหลดข้อมูลผู้ขายใหม่' },
      { status: 409 }
    );
  }
  return NextResponse.json({ updatedAt: data.updated_at });
}

async function savePlatformDetails(request: Request) {
  const parsed = salesPartySchema('seller')
    .extend({ id: z.string().min(1).max(100), revision: z.iso.datetime({ offset: true }) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'ข้อมูลแพลตฟอร์มไม่ถูกต้อง' },
      { status: 400 }
    );
  }
  const { id, revision, name, address, taxId, platformLogoUrl, platformTransparentLogoUrl } =
    parsed.data;
  const provider = await getPlatformProvider();
  if (provider.error)
    return NextResponse.json({ message: 'ตรวจสอบข้อมูลแพลตฟอร์มไม่สำเร็จ' }, { status: 500 });
  if (!provider.data || String(provider.data.id) !== id) {
    return NextResponse.json({ message: 'ไม่พบข้อมูลแพลตฟอร์มที่เลือก' }, { status: 404 });
  }
  const { data, error } = await supabaseAdmin
    .from('marketplace_provider_settings')
    .update({
      document_issuer_name: name,
      document_tax_address: address,
      tax_id: taxId,
      ...(platformLogoUrl !== undefined && { logo_url: platformLogoUrl || null }),
      ...(platformTransparentLogoUrl !== undefined && {
        transparent_logo_url: platformTransparentLogoUrl || null,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', provider.data.id)
    .eq('updated_at', revision)
    .select('id')
    .maybeSingle();
  if (error)
    return NextResponse.json({ message: 'บันทึกข้อมูลแพลตฟอร์มไม่สำเร็จ' }, { status: 500 });
  if (!data)
    return NextResponse.json(
      { message: 'ข้อมูลแพลตฟอร์มเปลี่ยนไป กรุณาโหลดใหม่ก่อนแก้ไข' },
      { status: 409 }
    );
  return NextResponse.json({ id: data.id });
}

export async function POST(request: Request) {
  if (!requireRole(request, ['master_admin'])) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์แก้ไขข้อมูลคู่ค้า' }, { status: 403 });
  }
  const selection = getParty(request);
  if (!selection.success) {
    return NextResponse.json({ message: 'ประเภทคู่ค้าไม่ถูกต้อง' }, { status: 400 });
  }
  const party = selection.data;
  const label = salesPartyLabel[party];
  const view = new URL(request.url).searchParams.get('view');
  if (party === 'seller' && view === 'platform-details') return savePlatformDetails(request);
  if (party === 'seller' && view === 'signature') {
    return saveOfficialSignature(request);
  }
  const writeSchema = salesPartySchema(party).extend({
    id: z.uuid().optional(),
    revision: z.iso.datetime({ offset: true }).optional(),
  });
  const parsed = writeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? `ข้อมูล${label}ไม่ถูกต้อง` },
      { status: 400 }
    );
  }
  const { id, revision, name, address, taxId, isActive, schoolId, documentEmail, signatureImage } =
    parsed.data;
  if (id && !revision) {
    return NextResponse.json({ message: `กรุณาโหลดข้อมูล${label}ใหม่ก่อนบันทึก` }, { status: 400 });
  }
  if (party === 'customer' && schoolId) {
    const school = await supabaseAdmin
      .from('schools')
      .select('id')
      .eq('id', schoolId)
      .eq('workspace_type', 'school')
      .maybeSingle();
    if (school.error)
      return NextResponse.json({ message: 'ตรวจสอบโรงเรียนไม่สำเร็จ' }, { status: 500 });
    if (!school.data)
      return NextResponse.json({ message: 'ไม่พบโรงเรียนที่เลือก' }, { status: 400 });
  }
  const values = {
    name,
    address,
    tax_id: taxId,
    is_active: isActive,
    ...(party === 'seller' && signatureImage !== undefined && { signature_image: signatureImage }),
    ...(party === 'customer' && documentEmail !== undefined && { document_email: documentEmail }),
    ...(party === 'customer' && schoolId !== undefined && { school_id: schoolId }),
  };
  const table = partyTable(party);
  const { data, error } = id
    ? await table
        .update(values)
        .eq('id', id)
        .eq('updated_at', revision!)
        .select(partyFields(party))
        .maybeSingle()
        .overrideTypes<LocalPartyRow, { merge: false }>()
    : await table
        .insert(values)
        .select(partyFields(party))
        .single()
        .overrideTypes<LocalPartyRow, { merge: false }>();
  if (party === 'customer' && error?.code === '23505') {
    return NextResponse.json({ message: 'โรงเรียนนี้ผูกกับลูกค้ารายอื่นแล้ว' }, { status: 409 });
  }
  if (error)
    return NextResponse.json({ message: `บันทึกข้อมูล${label}ไม่สำเร็จ` }, { status: 500 });
  if (!data)
    return NextResponse.json(
      { message: `ข้อมูล${label}เปลี่ยนไป กรุณาโหลดใหม่ก่อนแก้ไข` },
      { status: 409 }
    );
  return NextResponse.json({ seller: localParty(data) }, { status: id ? 200 : 201 });
}
