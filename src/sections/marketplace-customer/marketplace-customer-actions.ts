export type MarketplaceCustomerPurchase = {
  id: string;
  buyer_profile_id: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  user_is_active: boolean;
  order_item_id: string;
  plan_code: string | null;
  feature_keys: string[];
  starts_at: string;
  expires_at: string;
  status: string;
  workspace_type: 'individual' | 'personal';
};

export async function listMarketplaceCustomerPurchases(
  page: number,
  search: string
): Promise<{
  purchases: MarketplaceCustomerPurchase[];
  total: number;
}> {
  const params = new URLSearchParams({ page: String(page), search });
  const response = await fetch(`/api/master/marketplace-customers?${params}`);
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถโหลดข้อมูลได้');
  return json;
}
