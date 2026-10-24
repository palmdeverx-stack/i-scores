'use client';

import type { InventoryPurchaseDetail } from '../types';

import { useMemo } from 'react';

import PdfDocumentPreview from 'src/components/pdf-document-preview/pdf-document-preview';

import { purchaseDocumentNumber } from '../inventory-purchase-status';
import { InventoryPurchaseDocument } from './inventory-purchase-document';

export default function InventoryPurchasePreview({ detail }: { detail: InventoryPurchaseDetail }) {
  const document = useMemo(() => <InventoryPurchaseDocument detail={detail} />, [detail]);
  return (
    <PdfDocumentPreview
      document={document}
      fileName={`${purchaseDocumentNumber(detail.purchase.purchase_number)}.pdf`}
      label="ใบขออนุมัติจัดซื้อพัสดุ"
    />
  );
}
