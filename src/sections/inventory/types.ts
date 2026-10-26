export type InventoryItem = {
  item_type: 'material' | 'equipment';
  material_subtype: 'consumable' | null;
  id: string;
  code: string;
  name: string;
  description: string;
  brand: string;
  model: string;
  specifications: string;
  barcode: string;
  reference_price: number;
  supplier: string;
  notes: string;
  image_path: string | null;
  category: string;
  unit: string;
  location: string | null;
  minimum_stock: number;
  maximum_stock: number;
  quantity: number;
};
export type InventoryMovement = {
  return_id?: string | null;
  document_id: string | null;
  document: { document_number: number } | null;
  id: string;
  item_id: string;
  kind: 'receive' | 'issue';
  quantity: number;
  recipient: string;
  note: string;
  created_at: string;
};
export type InventoryMaster = { id: string; name: string; is_active: boolean };
export type InventoryDocument = {
  source_request_id: string | null;
  source_purchase_id: string | null;
  id: string;
  document_number: number;
  kind: 'receive' | 'issue';
  status: 'submitted' | 'posted' | 'rejected';
  recipient: string;
  note: string;
  reference_number: string;
  document_date: string | null;
  created_at: string;
  review_note: string;
  reviewed_at: string | null;
  lines: { item_id: string; quantity: number }[];
};
export type Inventory = {
  documents: InventoryDocument[];
  canApprove: boolean;
  items: InventoryItem[];
  movements: InventoryMovement[];
  categories: InventoryMaster[];
  units: InventoryMaster[];
  locations: InventoryMaster[];
  canManage: boolean;
};

export type InventoryPurchase = {
  created_by: string;
  id: string;
  purchase_number: number;
  title: string;
  purpose: string;
  status:
    | 'draft'
    | 'submitted'
    | 'approved'
    | 'rejected'
    | 'ordered'
    | 'partially_received'
    | 'received';
  lines: { item_id: string; quantity: number }[];
  created_at: string;
  review_note: string;
  supplier: string;
  order_number: string;
  order_date: string | null;
  attachment_path: string | null;
};
export type InventoryPurchaseData = {
  purchases: InventoryPurchase[];
  canManage: boolean;
  canApprove: boolean;
};

export type InventoryPurchaseDetail = {
  canEditDraft: boolean;
  purchase: InventoryPurchase & { reviewed_at?: string | null };
  items: Pick<InventoryItem, 'id' | 'code' | 'name' | 'unit'>[];
  remaining: { item_id: string; quantity: number }[];
  schoolName: string;
  requestedBy: string;
  reviewedBy: string;
  canManage: boolean;
  canApprove: boolean;
};

export type InventoryAsset = {
  id: string;
  item_id: string;
  receipt_movement_id: string;
  asset_code: string;
  serial_number: string;
  acquisition_date: string;
  acquisition_cost: number;
  status: 'registered' | 'in_use' | 'maintenance';
  activated_at: string | null;
  custodian: string;
  location: string | null;
  notes: string;
  registered_at: string;
};
export type InventoryAssetReceipt = {
  movement_id: string;
  received_at: string;
  quantity: number;
  registered_count: number;
};
