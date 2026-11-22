import type { SalesParty, SalesSellerInput } from './sales-seller-schema';

import { salesPartyLabel } from './sales-seller-schema';

export type SalesSeller = SalesSellerInput & {
  id: string;
  source: 'platform' | 'marketplace' | 'local';
  updatedAt: string | null;
  logoUrl?: string;
  platformRevision?: string;
};

export type SalesCustomerSchool = { id: string; name: string; code: string };
export const SALES_CUSTOMER_SCHOOLS_QUERY_KEY = ['master-sales-customer-schools'] as const;

export const salesPartyQueryKey = (party: SalesParty) => ['master-sales-sellers', party] as const;
const endpoint = (party: SalesParty) => `/api/master/sales-sellers?party=${party}`;

async function parseResponse<T>(response: Response, party: SalesParty): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data)
    throw new Error(data?.message ?? `ไม่สามารถจัดการข้อมูล${salesPartyLabel[party]}ได้`);
  return data;
}

export async function getSalesSystemLogo() {
  const result = await parseResponse<{ logoUrl: string | null }>(
    await fetch(`${endpoint('seller')}&view=branding`, { cache: 'no-store' }),
    'seller'
  );
  return result.logoUrl;
}

export async function listSalesCustomerSchools() {
  const result = await parseResponse<{ schools: SalesCustomerSchool[] }>(
    await fetch(`${endpoint('customer')}&view=schools`, { cache: 'no-store' }),
    'customer'
  );
  return result.schools;
}

export async function listSalesSellers(party: SalesParty) {
  const result = await parseResponse<{ sellers: SalesSeller[] }>(
    await fetch(endpoint(party), { cache: 'no-store' }),
    party
  );
  return result.sellers;
}

export async function saveSalesSeller(
  party: SalesParty,
  input: SalesSellerInput,
  seller?: SalesSeller
) {
  const isPlatform = party === 'seller' && seller?.source === 'platform';
  return parseResponse<{ seller?: SalesSeller }>(
    await fetch(isPlatform ? `${endpoint(party)}&view=platform-details` : endpoint(party), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input,
        ...(seller && {
          id: seller.id,
          revision: isPlatform ? seller.platformRevision : seller.updatedAt,
        }),
      }),
    }),
    party
  );
}

export async function saveOfficialSalesSignature(seller: SalesSeller, signatureImage: string) {
  return parseResponse<{ updatedAt: string }>(
    await fetch(`${endpoint('seller')}&view=signature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: seller.source,
        id: seller.id,
        signatureImage,
        revision: seller.updatedAt,
      }),
    }),
    'seller'
  );
}
