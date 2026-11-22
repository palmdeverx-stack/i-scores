import type { SalesQuotationEmailInput } from './sales-quotation-email-schema';
import type { SalesDocument, SalesDocumentKind, SalesDocumentDraft } from './sales-document-schema';

export type SalesDocumentSummary = Pick<
  SalesDocument,
  'id' | 'kind' | 'status' | 'document_number' | 'total_satang' | 'updated_at'
> & {
  title: string;
  customer: string;
  date: string;
};

const endpoint = '/api/master/sales-documents';

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.message ?? 'ไม่สามารถจัดการเอกสารได้');
  return data;
}

export async function listSalesDocuments(
  page: number,
  kind: SalesDocumentKind | '',
  status: SalesDocument['status'] | '',
  documentNumber?: string,
  signal?: AbortSignal
) {
  const params = new URLSearchParams({ page: String(page) });
  if (kind) params.set('kind', kind);
  if (status) params.set('status', status);
  if (documentNumber) params.set('documentNumber', documentNumber);
  return readResponse<{ documents: SalesDocumentSummary[]; total: number }>(
    await fetch(`${endpoint}?${params}`, { signal })
  );
}

export async function getSalesDocument(id: string, signal?: AbortSignal) {
  const result = await readResponse<{ document: SalesDocument }>(
    await fetch(`${endpoint}?${new URLSearchParams({ id })}`, { cache: 'no-store', signal })
  );
  return result.document;
}

export async function saveSalesDocument(
  draft: SalesDocumentDraft,
  document?: SalesDocument,
  issue = false
) {
  const result = await readResponse<{ document: SalesDocument }>(
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...draft,
        id: document?.id,
        revision: document?.updated_at,
        expectedStatus: document?.status,
        issue,
      }),
    })
  );
  return result.document;
}

export async function deleteSalesDocument(draft: Pick<SalesDocument, 'id' | 'updated_at'>) {
  return readResponse<{ id: string }>(
    await fetch(endpoint, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: draft.id, revision: draft.updated_at }),
    })
  );
}

export async function sendSalesQuotationEmail(
  id: string,
  revision: string,
  values: SalesQuotationEmailInput
) {
  return readResponse<{ sent: true }>(
    await fetch(`${endpoint}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, revision, ...values }),
    })
  );
}

export function salesDocumentPrintUrl(id: string) {
  return `${endpoint}/print?${new URLSearchParams({ id })}`;
}
