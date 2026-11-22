export const SALES_DOCUMENT_LABELS = {
  contract: 'สัญญา',
  quotation: 'ใบเสนอราคา',
  invoice: 'ใบแจ้งหนี้',
  billing_note: 'ใบวางบิล',
  receipt: 'ใบเสร็จรับเงิน',
  other: 'เอกสารการขายอื่น',
} as const;

// Keep these prefixes aligned with the annual numbering database trigger.
export const SALES_DOCUMENT_NUMBER_PREFIXES = {
  contract: 'CT',
  quotation: 'QU',
  invoice: 'INV',
  billing_note: 'BIL',
  receipt: 'RC',
  other: 'DOC',
} as const;

export const SALES_DOCUMENT_KINDS = [
  'contract',
  'quotation',
  'invoice',
  'billing_note',
  'receipt',
  'other',
] as const;
