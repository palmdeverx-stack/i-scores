import type { SupabaseClient } from '@supabase/supabase-js';
import type { MarketplaceCustomerPurchase } from 'src/sections/marketplace-customer/marketplace-customer-actions';

const LICENSE_FIELDS =
  'id, order_item_id, grants_plan_code, feature_keys, starts_at, expires_at, status';

// Explicit joins support shared Marketplace tables that have no profile foreign keys.
async function readAll<T>(
  build: (
    from: number,
    to: number
  ) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>
) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await build(offset, offset + 499);
    if (result.error) throw new Error(result.error.message);
    const batch = result.data ?? [];
    rows.push(...batch);
    if (batch.length < 500) return rows;
  }
}

type License = {
  id: string;
  buyer_id?: string;
  order_id?: string;
  order_item_id: string;
  grants_plan_code: string | null;
  feature_keys: string[] | null;
  starts_at: string;
  expires_at: string;
  status: string;
};

type Buyer = {
  id: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
};

async function readByIds<T>(db: SupabaseClient, table: string, fields: string, ids: string[]) {
  const rows: T[] = [];
  for (let index = 0; index < ids.length; index += 100) {
    rows.push(
      ...(await readAll<T>(
        (from, to) =>
          db
            .from(table)
            .select(fields)
            .in('id', ids.slice(index, index + 100))
            .order('id')
            .range(from, to) as unknown as PromiseLike<{
            data: T[] | null;
            error: { message: string } | null;
          }>
      ))
    );
  }
  return rows;
}

export async function loadMasterMarketplaceCustomers(
  db: SupabaseClient,
  page: number,
  search: string,
  now = Date.now()
) {
  const [individual, personal] = await Promise.all([
    readAll<License>((from, to) =>
      db
        .from('marketplace_user_licenses')
        .select(`${LICENSE_FIELDS}, buyer_id`)
        .order('id')
        .range(from, to)
    ),
    readAll<License>((from, to) =>
      db
        .from('marketplace_school_licenses')
        .select(`${LICENSE_FIELDS}, order_id, school:schools!inner(workspace_type)`)
        .eq('school.workspace_type', 'personal')
        .order('id')
        .range(from, to)
    ),
  ]);
  const orders = await readByIds<{ id: string; buyer_id: string }>(
    db,
    'marketplace_orders',
    'id, buyer_id',
    [...new Set(personal.flatMap((row) => (row.order_id ? [row.order_id] : [])))]
  );
  const orderBuyers = new Map(orders.map((row) => [row.id, row.buyer_id]));
  const buyerIds = [
    ...new Set([
      ...individual.flatMap((row) => (row.buyer_id ? [row.buyer_id] : [])),
      ...orders.map((row) => row.buyer_id),
    ]),
  ];
  const buyers = await readByIds<Buyer>(
    db,
    'marketplace_users',
    'id, username, email, first_name, last_name, is_active',
    buyerIds
  );
  const buyerMap = new Map(buyers.map((buyer) => [buyer.id, buyer]));
  // Older purchases used an app_users ID before Marketplace profiles were split out.
  const legacyBuyers = await readByIds<Buyer>(
    db,
    'app_users',
    'id, username, email, first_name, last_name, is_active',
    buyerIds.filter((id) => !buyerMap.has(id))
  );
  for (const buyer of legacyBuyers) buyerMap.set(buyer.id, buyer);
  const purchases: MarketplaceCustomerPurchase[] = [];
  const needle = search.trim().toLocaleLowerCase();
  for (const [workspaceType, licenses] of [
    ['individual', individual],
    ['personal', personal],
  ] as const) {
    for (const license of licenses) {
      const buyerId =
        workspaceType === 'individual' ? license.buyer_id : orderBuyers.get(license.order_id!);
      const buyer = buyerId ? buyerMap.get(buyerId) : undefined;
      if (!buyer) throw new Error('Marketplace purchase is missing its buyer profile');
      const searchable = [
        buyer.username,
        buyer.email,
        buyer.first_name,
        buyer.last_name,
        license.grants_plan_code,
      ]
        .join(' ')
        .toLocaleLowerCase();
      if (needle && !searchable.includes(needle)) continue;
      const status =
        license.status !== 'active'
          ? license.status
          : new Date(license.expires_at).getTime() <= now
            ? 'expired'
            : new Date(license.starts_at).getTime() > now
              ? 'pending'
              : 'active';
      purchases.push({
        id: `${workspaceType}:${license.id}`,
        buyer_profile_id: buyer.id,
        username: buyer.username,
        email: buyer.email,
        first_name: buyer.first_name,
        last_name: buyer.last_name,
        user_is_active: buyer.is_active,
        order_item_id: license.order_item_id,
        plan_code: license.grants_plan_code,
        feature_keys: license.feature_keys ?? [],
        starts_at: license.starts_at,
        expires_at: license.expires_at,
        status,
        workspace_type: workspaceType,
      });
    }
  }
  purchases.sort((a, b) => b.starts_at.localeCompare(a.starts_at) || a.id.localeCompare(b.id));
  return { purchases: purchases.slice(page * 25, (page + 1) * 25), total: purchases.length };
}
