import type { SalesDocumentDraft } from './sales-document-schema';

import { paths } from 'src/routes/paths';

import { escapeHtml } from 'src/lib/escape-html';

import { salesSignatureSchema } from './sales-signature-schema';
import { salesDocumentBahtText } from './sales-document-baht-text';
import { salesDocumentLogoSchema } from './sales-document-logo-schema';
import { sanitizeSalesDocumentText } from './sales-document-rich-text';
import { SALES_DOCUMENT_NUMBER_PREFIXES } from './sales-document-kinds';
import {
  salesMoney,
  salesDocumentTotals,
  SALES_DOCUMENT_LABELS,
  salesDocumentRequiresItems,
} from './sales-document-schema';

const dateFormat = new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

const issueDateFormat = new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'medium',
  timeZone: 'Asia/Bangkok',
});

const documentYearFormat = new Intl.DateTimeFormat('en-US', {
  calendar: 'buddhist',
  numberingSystem: 'latn',
  timeZone: 'Asia/Bangkok',
  year: '2-digit',
});

export function renderSalesDocumentHtml({
  kind,
  content,
  documentNumber,
  issuedAt,
  editHref,
  showPrintButton = false,
}: SalesDocumentDraft & {
  documentNumber?: string | null;
  issuedAt?: string | null;
  editHref?: string;
  showPrintButton?: boolean;
}) {
  const label = SALES_DOCUMENT_LABELS[kind];
  const paperNumber =
    documentNumber ||
    `${SALES_DOCUMENT_NUMBER_PREFIXES[kind]}${documentYearFormat.formatToParts(new Date()).find((part) => part.type === 'year')?.value}000x`;
  const usesItemizedLayout = salesDocumentRequiresItems(kind);
  const signerLabels = {
    quotation: ['ลงชื่อผู้เสนอราคา', 'ลงชื่อผู้อนุมัติ'],
    invoice: ['ลงชื่อผู้อนุมัติ', 'ลงชื่อผู้รับใบแจ้งหนี้'],
    billing_note: ['ลงชื่อผู้วางบิล', 'ลงชื่อผู้รับวางบิล'],
    receipt: ['ลงชื่อผู้รับเงิน', ''],
    contract: ['ลายเซ็นผู้ขาย', 'ลายเซ็นลูกค้า'],
    other: ['ลายเซ็นผู้ขาย', ''],
  } as const;
  const [signerLabel, recipientLabel] = signerLabels[kind];
  const hasReceiptConfirmation = kind === 'invoice' || kind === 'billing_note';
  const signatureBlank = '<span class="signature-blank" aria-hidden="true"></span>';
  const signatureDate = `<span class="signature-date fillable">วันที่ ${signatureBlank}${
    hasReceiptConfirmation
      ? ` เดือน ${signatureBlank} พ.ศ. ${signatureBlank}`
      : ` / ${signatureBlank} / ${signatureBlank}`
  }</span>`;
  const hasLegacyContractTerms = kind === 'contract' && content.conditions === undefined;
  const totals = salesDocumentTotals(content);
  const logo = salesDocumentLogoSchema.safeParse(content.seller.logoUrl);
  const signature = salesSignatureSchema.safeParse(content.seller.signatureImage);
  const availableSignature = signature.success && signature.data;
  const signatureImage = (showPrintButton || content.seller.showSignature) && availableSignature;
  const summaryMoney = new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const summaryRows = usesItemizedLayout
    ? ([
        ['รวมเป็นเงิน (Subtotal)', totals.subtotal],
        ['หักส่วนลดพิเศษ (Special Discount)', content.discountSatang],
        ...(content.taxBasisPoints
          ? [[`ภาษี ${content.taxBasisPoints / 100}%`, totals.tax] as const]
          : []),
        ['รวมเป็นเงินทั้งสิ้น (Total)', totals.total],
      ] as const)
    : [];
  const money = (value: number) => salesMoney.format(value / 100);
  const party = (heading: string, value: typeof content.seller) => `<section class="party-card">
    <h2>${heading}</h2><strong>${escapeHtml(value.name || '—')}</strong>
    ${value.address ? `<p class="multiline">${escapeHtml(value.address)}</p>` : ''}
    ${value.taxId ? `<p>เลขประจำตัวผู้เสียภาษี ${escapeHtml(value.taxId)}</p>` : ''}
  </section>`;

  const textSection = (heading: string | null, value?: string) => {
    const richText = content.textFormat === 'html';
    const text = richText ? sanitizeSalesDocumentText(value ?? '') : escapeHtml(value ?? '');
    if (!text) return '';
    return `<section class="notes">${heading ? `<h2>${heading}</h2>` : ''}<div class="${richText ? 'document-rich-text' : 'multiline'}">${text}</div></section>`;
  };

  return `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(documentNumber || content.title)} | ${label}</title>
<style>
@font-face{font-family:LINE Seed;src:url('/fonts/LINESeedSansTH-Regular.woff2') format('woff2');font-weight:400}
@font-face{font-family:LINE Seed;src:url('/fonts/LINESeedSansTH-Bold.woff2') format('woff2');font-weight:700}
*{box-sizing:border-box}body{margin:0;background:#f4f6f8;color:#182230;font:15px/1.55 "LINE Seed",Tahoma,sans-serif}
main{max-width:850px;min-height:680px;margin:24px auto;padding:36px;background:white;font-size:15px}
main header{border-bottom:1px solid #d5dfeb;padding-bottom:22px}
.paper-heading{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,auto);align-items:start;gap:16px 24px}
.document-heading{display:flex;align-items:center;gap:16px;min-width:0}
.document-heading h1{color:#14243a;line-height:1.2;overflow-wrap:anywhere}
.document-heading p{margin-top:6px;color:#546375}
.document-logo{width:72px;height:64px;object-fit:contain;flex-shrink:0}
.paper-details{text-align:right;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.paper-original{margin-bottom:7px;color:#17488d;font-weight:700}
.paper-details strong{display:block;font-size:20px;line-height:1.3;color:#14243a;margin-bottom:8px}
.paper-date{color:#526479}
.paper-date time{color:#182230;font-weight:700}
h1,h2,p{margin:0}h1{font-size:28px}h2{font-size:16px;margin-bottom:6px}
.parties{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:20px 0}
.party-card{min-width:0;break-inside:avoid}
.party-card h2{color:#17488d;margin-bottom:6px}
.party-card p{color:#526479}.party-card strong{display:block;margin-bottom:3px}
.paper-reference{margin-top:14px;color:#526479}
strong,p,td{overflow-wrap:anywhere}.multiline{white-space:pre-wrap}
table{width:100%;border-collapse:collapse;margin-top:16px}th,td{padding:8px;border-bottom:1px solid #d9dfe7;text-align:left;vertical-align:top}
th{background:#f4f6f8}.number{text-align:right;white-space:nowrap}.totals{max-width:310px;margin:12px 0 22px auto}
.sales-summary{break-inside:avoid}
.sales-totals{margin-top:0;border-top:3px solid #182230}
.sales-totals th,.sales-totals td{padding:6px 8px;background:none;border-bottom:0}
.sales-totals th,.sales-totals td:last-child{text-align:right}
.sales-totals td:last-child{width:55px}
.sales-amount{padding:7px 9px;border-block:1px solid #d5dfeb;background:#f4f6f8;font-weight:700}
.signature-name,.signature-date{display:block;margin-top:5px}
.signature-name.fillable,.signature-date.fillable{display:flex;align-items:baseline;gap:5px}
.signature-blank{flex:1;min-width:0;border-bottom:1px dotted currentColor}
.signature-date .signature-blank:last-child{flex:1.4}
.totals td:last-child{text-align:right}.notes{margin-top:20px}
.document-rich-text{overflow-wrap:anywhere;white-space:pre-wrap}.document-rich-text p{margin:0 0 0.65em}.document-rich-text p:empty{min-height:1.55em}.document-rich-text li p{margin:0}.document-rich-text ul,.document-rich-text ol{margin:0.5em 0;padding-inline-start:1.7em}
.signatures{display:flex;justify-content:flex-end;gap:24px;margin-top:32px;text-align:center;color:#4d5a68;break-inside:avoid}
.signature-slot{width:200px;max-width:100%;min-width:0}.signature-space{height:64px;margin-bottom:8px}
.signatures.paired-signatures{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));justify-content:stretch;column-gap:0;justify-items:center;align-items:start}
.signatures.single-signature{justify-content:center}
.paired-signatures .signature-slot,.single-signature .signature-slot{width:min(260px,calc(100% - 24px))}
.signature-image{display:block;width:min(160px,100%);height:100%;object-fit:contain;margin:0 auto}
.signatures p{border-top:1px solid #8c96a3;padding-top:8px}
.document-view{background:#fff;padding:clamp(12px,2vw,28px)}
.view-heading{margin-bottom:24px}.view-title{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px}
.view-back{display:inline-flex;align-items:center;gap:8px;margin-bottom:12px;padding:6px 10px;border:1px solid #d9dfe7;border-radius:8px;color:inherit;text-decoration:none}
.view-back:hover{background:#f4f6f8}.view-back:focus-visible{outline:2px solid #204da3;outline-offset:3px}
.view-title h1{font-size:clamp(22px,3vw,32px);min-width:0;overflow-wrap:anywhere}
.view-badge{padding:3px 10px;border-radius:8px;background:#e3eaff;color:#204da3;font-size:13px}
.view-reference{margin-top:6px;color:#5c6c7c}
.document-workspace{padding:clamp(12px,2vw,24px);border-radius:20px;background:#eaf2fc}
.toolbar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px;color:#324b5c}
.toolbar-actions{display:flex;align-items:center;flex-wrap:wrap;gap:10px 16px}
.print-signature-option{display:inline-flex;align-items:center;gap:7px}
.print-signature-option input{width:16px;height:16px;margin:0;accent-color:#006346}
.print-signature-note{font-size:13px}.print-signature-note a{color:#17488d}
.document-view:has(#print-seller-signature:not(:checked)) .signature-image{display:none}
.toolbar button{display:inline-flex;align-items:center;gap:8px;border:1px solid #74aa96;border-radius:8px;background:transparent;color:#006346;font:inherit;font-weight:700;padding:6px 12px;cursor:pointer}
.toolbar button:hover{background:#ddf1e9}.toolbar button:focus-visible{outline:2px solid #006346;outline-offset:3px}
.document-view main{width:100%;max-width:210mm;min-height:297mm;margin:0 auto;padding:clamp(16px,6.67vw,14mm)}
@page{size:A4 portrait;margin:14mm}
@media print{
  body.document-view{background:white;padding:0}.view-heading,.toolbar{display:none}
  .document-workspace{padding:0;background:none;border-radius:0}
  main,.document-view main{width:auto;margin:0;padding:0;max-width:none;min-height:0}
  tr{break-inside:avoid}thead{display:table-header-group}
}
@media screen and (max-width:600px){main{margin:0;padding:20px}.parties{gap:12px}.number{white-space:normal}}
@media screen and (max-width:440px){
  .paper-heading,.parties{grid-template-columns:minmax(0,1fr)}
  .paper-details{text-align:left}.document-heading{gap:12px}.document-logo{width:54px;height:54px}
}
</style></head><body${showPrintButton ? ' class="document-view"' : ''}>
${
  showPrintButton
    ? `<div class="view-heading">
  <a class="view-back" href="${paths.master.salesDocumentsByKind(kind)}"><span aria-hidden="true">←</span> ย้อนกลับ</a>
  <div class="view-title"><h1>${escapeHtml(content.title)}</h1><span class="view-badge">${label}</span></div>
  <p class="view-reference">${documentNumber ? `เลขที่เอกสาร ${escapeHtml(documentNumber)}` : 'แบบร่าง'}</p>
</div>
<div class="document-workspace">
  <div class="toolbar">
    <span>A4 แนวตั้ง</span>
    <div class="toolbar-actions">
    ${
      availableSignature
        ? `<label class="print-signature-option"><input type="checkbox" id="print-seller-signature"${content.seller.showSignature ? ' checked' : ''}> ใส่ลายเซ็นใน PDF</label>`
        : `<span class="print-signature-note">เอกสารนี้ยังไม่มีลายเซ็น${editHref ? ` · <a href="${escapeHtml(editHref)}">ไปเลือกผู้ขายที่มีลายเซ็น</a>` : ''}</span>`
    }
    <button type="button" onclick="window.print()">
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3v12m-5-5 5 5 5-5M4 20h16"/>
      </svg>
      บันทึก PDF
    </button>
    </div>
  </div>`
    : ''
}
<main>
<header>
  <div class="paper-heading">
    <div class="document-heading">
      ${logo.success ? `<img class="document-logo" src="${escapeHtml(logo.data)}" alt="โลโก้ผู้ขาย" referrerpolicy="no-referrer">` : ''}
      <div><h1>${label}</h1><p>${escapeHtml(content.title)}</p></div>
    </div>
    <div class="paper-details">
      <p class="paper-original">ต้นฉบับ</p>
      <strong>เลขที่ ${escapeHtml(paperNumber)}</strong>
      ${
        issuedAt
          ? `<p class="paper-date">วันที่ออกเอกสาร <time datetime="${escapeHtml(issuedAt)}">${issueDateFormat.format(new Date(issuedAt))}</time></p>`
          : `<p class="paper-date">วันที่เอกสาร <time datetime="${escapeHtml(content.documentDate)}">${dateFormat.format(new Date(content.documentDate))}</time></p>`
      }
      <p class="paper-date">วันหมดอายุ ${content.dueDate ? `<time datetime="${escapeHtml(content.dueDate)}">${dateFormat.format(new Date(content.dueDate))}</time>` : '—'}</p>
    </div>
  </div>
  ${content.reference ? `<p class="paper-reference">อ้างอิง ${escapeHtml(content.reference)}</p>` : ''}
</header>
<div class="parties">${party('ผู้ขาย', content.seller)}${party('ลูกค้า', content.customer)}</div>
${
  content.items.length
    ? `<table><thead><tr>
  <th scope="col">สินค้า / บริการ</th><th scope="col" class="number">จำนวน</th>
  <th scope="col" class="number">ราคาต่อหน่วย</th><th scope="col" class="number">จำนวนเงิน</th>
</tr></thead><tbody>
${content.items
  .map(
    (item) => `<tr><td>${escapeHtml(item.description)}</td><td class="number">${item.quantity}</td>
<td class="number">${money(item.unitPriceSatang)}</td><td class="number">${money(item.quantity * item.unitPriceSatang)}</td></tr>`
  )
  .join('')}
</tbody></table>`
    : ''
}
${
  usesItemizedLayout
    ? `<section class="sales-summary" aria-label="สรุปยอดเอกสาร">
<table class="sales-totals"><tbody>
${summaryRows.map(([labelText, amount]) => `<tr><th scope="row">${labelText}</th><td class="number">${summaryMoney.format(amount / 100)}</td><td>บาท</td></tr>`).join('')}
</tbody></table>
<p class="sales-amount">จำนวนเงิน (Amount) ${salesDocumentBahtText(totals.total)}</p>
</section>`
    : content.items.length
      ? `<table class="totals"><tbody>
<tr><td>รวมก่อนส่วนลด</td><td>${money(totals.subtotal)}</td></tr>
${content.discountSatang ? `<tr><td>ส่วนลด</td><td>${money(content.discountSatang)}</td></tr>` : ''}
${content.taxBasisPoints ? `<tr><td>ภาษี ${content.taxBasisPoints / 100}%</td><td>${money(totals.tax)}</td></tr>` : ''}
<tr><td><strong>ยอดรวมสุทธิ</strong></td><td><strong>${money(totals.total)}</strong></td></tr>
</tbody></table>`
      : ''
}
${usesItemizedLayout ? textSection(null, content.details) : ''}
${textSection('เงื่อนไข', hasLegacyContractTerms ? content.notes : content.conditions)}
${hasLegacyContractTerms ? '' : textSection('หมายเหตุ', content.notes)}
<div class="signatures${recipientLabel && usesItemizedLayout ? ' paired-signatures' : usesItemizedLayout ? ' single-signature' : ''}">
  <div class="signature-slot">
    <div class="signature-space">${signatureImage ? `<img class="signature-image" src="${escapeHtml(signatureImage)}" alt="ลายเซ็นผู้ขาย">` : ''}</div>
    <p>${signerLabel}</p>
    ${usesItemizedLayout ? `<span class="signature-name">( ${escapeHtml(content.seller.name || '....................................')} )</span>` : ''}
    ${hasReceiptConfirmation ? signatureDate : ''}
  </div>
  ${
    recipientLabel
      ? `<div class="signature-slot">
    <div class="signature-space"></div><p>${recipientLabel}</p>
    ${usesItemizedLayout ? `<span class="signature-name fillable">( ${signatureBlank} )</span>${signatureDate}` : ''}
  </div>`
      : ''
  }
</div>
</main>${showPrintButton ? '</div>' : ''}</body></html>`;
}
