import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const modules = new Map();
function load(path) {
  if (modules.has(path)) return modules.get(path);
  const exports = {};
  const code = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'exports', code)((name) => {
    if (name.startsWith('.')) return load(resolve(dirname(path), `${name}.ts`));
    if (name.startsWith('src/')) return load(resolve(`${name}.ts`));
    return require(name);
  }, exports);
  modules.set(path, exports);
  return exports;
}

const sections = 'src/sections/sales-documents';
const { salesDocumentFormDefaults, salesDocumentFormSchema } = load(
  resolve(sections, 'sales-document-form-schema.ts')
);
const { renderSalesDocumentHtml } = load(resolve(sections, 'sales-document-html.ts'));

function filledForm() {
  const form = salesDocumentFormDefaults(undefined, 'invoice');
  form.content.title = '<script>ชื่อเอกสาร</script>';
  form.content.documentDate = '2026-11-22T00:00:00+07:00';
  form.content.dueDate = '2026-11-30T00:00:00+07:00';
  form.content.items = [{ description: 'อุปกรณ์', quantity: '2', unitPrice: '123.45' }];
  form.content.discountSatang = '0.10';
  form.content.taxBasisPoints = '7';
  return form;
}

test('preserves the calendar date selected by DatePicker and converts amounts to satang', () => {
  const draft = salesDocumentFormSchema.parse(filledForm());
  assert.equal(draft.kind, 'invoice');
  assert.equal(draft.content.documentDate, '2026-11-22');
  assert.equal(draft.content.dueDate, '2026-11-30');
  assert.equal(draft.content.items[0].unitPriceSatang, 12345);
  assert.equal(draft.content.discountSatang, 10);
  assert.equal(draft.content.taxBasisPoints, 700);
});

test('validates dates and amounts on the corresponding form fields', () => {
  const form = filledForm();
  form.content.dueDate = '2026-11-21T00:00:00+07:00';
  const dateError = salesDocumentFormSchema.safeParse(form);
  assert.equal(dateError.success, false);
  assert.deepEqual(dateError.error.issues[0].path, ['content', 'dueDate']);
  form.content.dueDate = null;
  form.content.items[0].unitPrice = '123.456';
  const amountError = salesDocumentFormSchema.safeParse(form);
  assert.equal(amountError.success, false);
  assert.deepEqual(amountError.error.issues[0].path, ['content', 'items', 0, 'unitPrice']);
});

test('preview and print use the same document body with escaped fields', () => {
  const draft = salesDocumentFormSchema.parse(filledForm());
  const preview = renderSalesDocumentHtml(draft);
  const printed = renderSalesDocumentHtml({ ...draft, showPrintButton: true });
  assert.match(preview, /&lt;script&gt;/);
  assert.doesNotMatch(preview, /<script>/);
  assert.doesNotMatch(preview, /window\.print\(\)/);
  assert.match(printed, /window\.print\(\)/);
  assert.match(printed, /class="document-workspace"/);
  assert.match(printed, /บันทึก PDF/);
  assert.match(printed, /class="view-back" href="\/master\/sales-documents\/invoice"/);
  assert.doesNotMatch(preview, /class="document-workspace"/);
  assert.equal(printed.match(/<main>[\s\S]*<\/main>/)?.[0], preview.match(/<main>[\s\S]*<\/main>/)?.[0]);
});

test('stores an optional customer delivery email with the document', () => {
  const form = filledForm();
  form.content.customer.documentEmail = '  billing@example.com  ';
  const draft = salesDocumentFormSchema.parse(form);
  assert.equal(draft.content.customer.documentEmail, 'billing@example.com');
  assert.doesNotMatch(renderSalesDocumentHtml(draft), /billing@example\.com/);

  form.content.customer.documentEmail = 'invalid';
  const invalid = salesDocumentFormSchema.safeParse(form);
  assert.equal(invalid.success, false);
  assert.deepEqual(invalid.error.issues[0].path, ['content', 'customer', 'documentEmail']);
});

test('renders a stored seller signature only when enabled on the document', () => {
  const form = filledForm();
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0N8AAAAASUVORK5CYII=';
  form.content.seller.signatureImage = png;
  form.content.seller.showSignature = false;
  const unsigned = renderSalesDocumentHtml(salesDocumentFormSchema.parse(form));
  assert.doesNotMatch(unsigned, /<img /);
  assert.match(unsigned, /<div class="signature-space"><\/div>\s*<p>ลงชื่อผู้อนุมัติ<\/p>/);
  const unsignedPrint = renderSalesDocumentHtml({
    ...salesDocumentFormSchema.parse(form),
    showPrintButton: true,
  });
  assert.match(unsignedPrint, /id="print-seller-signature"> ใส่ลายเซ็นใน PDF/);
  assert.match(unsignedPrint, /:has\(#print-seller-signature:not\(:checked\)\) .signature-image\{display:none\}/);

  form.content.seller.showSignature = true;
  const draft = salesDocumentFormSchema.parse(form);
  assert.match(renderSalesDocumentHtml(draft), /<img class="signature-image" src="data:image\/png/);
  assert.match(renderSalesDocumentHtml({ ...draft, showPrintButton: true }), /<img class="signature-image"/);
  assert.match(renderSalesDocumentHtml({ ...draft, showPrintButton: true }), /id="print-seller-signature" checked/);

  form.content.seller.signatureImage = 'data:image/svg+xml;base64,PHN2Zz4=';
  assert.equal(salesDocumentFormSchema.safeParse(form).success, false);
});

test('renders a selected HTTPS logo in preview and print and allows removing it', () => {
  const form = filledForm();
  form.content.seller.logoUrl = 'https://example.com/logo.png?width=160&height=120';
  const draft = salesDocumentFormSchema.parse(form);
  for (const showPrintButton of [false, true]) {
    assert.match(
      renderSalesDocumentHtml({ ...draft, showPrintButton }),
      /<img class="document-logo" src="https:\/\/example\.com\/logo\.png\?width=160&amp;height=120"/
    );
  }
  form.content.seller.logoUrl = null;
  assert.doesNotMatch(renderSalesDocumentHtml(salesDocumentFormSchema.parse(form)), /<img class="document-logo"/);
  form.content.seller.logoUrl = 'javascript:alert(1)';
  assert.equal(salesDocumentFormSchema.safeParse(form).success, false);
});

test('shows official number, Bangkok issue date and expiry in the paper header', () => {
  const draft = salesDocumentFormSchema.parse(filledForm());
  const html = renderSalesDocumentHtml({
    ...draft,
    documentNumber: 'INV690001',
    issuedAt: '2026-11-22T18:30:00Z',
  });
  assert.match(html, /class="paper-details"[^>]*>\s*<p class="paper-original">ต้นฉบับ<\/p>\s*<strong>เลขที่ INV690001<\/strong>/);
  assert.match(html, /วันที่ออกเอกสาร <time[^>]*>23 พ\.ย\. 2569/);
  assert.match(html, /วันหมดอายุ <time[^>]*>30 พ\.ย\. 2569/);
});

test('shows a placeholder document number on unissued quotations', () => {
  const draft = salesDocumentFormSchema.parse({ ...filledForm(), kind: 'quotation' });
  assert.match(renderSalesDocumentHtml(draft), /เลขที่ QU[0-9]{2}000x/);
});

test('defaults new sales documents to 15 days and keeps the saved expiry', () => {
  const { content } = salesDocumentFormDefaults();
  assert.equal((Date.parse(content.dueDate) - Date.parse(content.documentDate)) / 86_400_000, 15);

  const document = salesDocumentFormSchema.parse(filledForm());
  assert.equal(salesDocumentFormDefaults(document).content.dueDate, '2026-11-30');
  document.content.dueDate = '';
  assert.equal(salesDocumentFormDefaults(document).content.dueDate, null);
});

test('validates required issue fields at their paths while allowing the same draft to be saved', () => {
  const { salesDocumentIssueSchema } = load(resolve(sections, 'sales-document-schema.ts'));
  const form = filledForm();
  form.content.items = [];
  form.content.discountSatang = '0';
  const draft = salesDocumentFormSchema.parse(form);
  const issue = salesDocumentIssueSchema.safeParse(draft);
  assert.equal(issue.success, false);
  assert.deepEqual(issue.error.issues.map((entry) => entry.path), [
    ['content', 'seller', 'name'],
    ['content', 'customer', 'name'],
    ['content', 'items'],
  ]);
});

test('quotation shows the amount in Thai words and both signature slots', () => {
  const form = filledForm();
  form.kind = 'quotation';
  form.content.items = [{ description: 'พัฒนาระบบ', quantity: '1', unitPrice: '390000' }];
  form.content.discountSatang = '0';
  form.content.taxBasisPoints = '0';
  form.content.seller.name = 'ผู้ขายตัวอย่าง';
  form.content.details = 'ส่งมอบภายใน 120 วัน';
  form.content.conditions = 'ชำระตามงวด';
  form.content.notes = 'หมายเหตุทดสอบ';
  const html = renderSalesDocumentHtml(salesDocumentFormSchema.parse(form));
  assert.match(html, /รวมเป็นเงินทั้งสิ้น \(Total\)<\/th><td class="number">390,000\.00/);
  assert.match(html, /สามแสนเก้าหมื่นบาทถ้วน/);
  assert.doesNotMatch(html, /<h2>รายละเอียด<\/h2>/);
  assert.match(html, /ส่งมอบภายใน 120 วัน.*<h2>เงื่อนไข<\/h2>.*ชำระตามงวด.*<h2>หมายเหตุ<\/h2>.*หมายเหตุทดสอบ/s);
  assert.match(html, /ลงชื่อผู้เสนอราคา.*ผู้ขายตัวอย่าง/s);
  assert.match(html, /ลงชื่อผู้อนุมัติ.*วันที่/s);
  const { salesDocumentBahtText } = load(resolve(sections, 'sales-document-baht-text.ts'));
  assert.equal(salesDocumentBahtText(2101), 'ยี่สิบเอ็ดบาทหนึ่งสตางค์');
});

test('preserves quotation paragraphs and alignment while removing unsafe markup', () => {
  const form = filledForm();
  form.kind = 'quotation';
  form.content.details = '<p style="text-align: justify" onclick="alert(1)">ย่อหน้าแรก</p><p><strong>ย่อหน้าที่สอง</strong></p>';
  form.content.notes = '<ol><li><p>ชำระตามงวด</p></li></ol><script>alert(1)</script>';
  const saved = salesDocumentFormSchema.parse(form);
  const html = renderSalesDocumentHtml(saved);
  assert.match(html, /<p style="text-align:justify">ย่อหน้าแรก<\/p><p><strong>ย่อหน้าที่สอง<\/strong><\/p>/);
  assert.match(html, /<ol><li><p>ชำระตามงวด<\/p><\/li><\/ol>/);
  assert.doesNotMatch(html, /alert\(1\)|onclick/);

  delete saved.content.textFormat;
  saved.content.notes = '  ข้อความเดิม\nบรรทัดถัดไป <หมายเหตุ>';
  const legacy = salesDocumentFormDefaults(saved).content.notes;
  assert.equal(legacy, '<p>&nbsp;&nbsp;ข้อความเดิม</p><p>บรรทัดถัดไป &lt;หมายเหตุ&gt;</p>');
});

test('keeps first-line indentation and paragraph breaks in preview and print', () => {
  const form = filledForm();
  form.kind = 'quotation';
  form.content.details = '<p>    ย่อหน้าแรก<br>บรรทัดต่อมา</p><p>  ย่อหน้าที่สอง</p>';
  form.content.notes = '<p>    หมายเหตุ</p>';
  const saved = salesDocumentFormSchema.parse(form);

  for (const showPrintButton of [false, true]) {
    const html = renderSalesDocumentHtml({ ...saved, showPrintButton });
    assert.match(html, /\.document-rich-text\{[^}]*white-space:pre-wrap/);
    assert.match(html, /<p> {4}ย่อหน้าแรก<br>บรรทัดต่อมา<\/p><p> {2}ย่อหน้าที่สอง<\/p>/);
    assert.match(html, /<p> {4}หมายเหตุ<\/p>/);
  }
});

test('keeps legacy contract terms and requires conditions on newly split contracts', () => {
  const { salesDocumentIssueSchema } = load(resolve(sections, 'sales-document-schema.ts'));
  const contract = salesDocumentFormSchema.parse({ ...filledForm(), kind: 'contract' });
  contract.content.seller.name = 'ผู้ขาย';
  contract.content.customer.name = 'ลูกค้า';
  contract.content.notes = '<p>เงื่อนไขเดิม</p>';
  assert.deepEqual(salesDocumentIssueSchema.safeParse(contract).error.issues[0].path, ['content', 'conditions']);

  delete contract.content.conditions;
  assert.equal(salesDocumentIssueSchema.safeParse(contract).success, true);
  assert.match(renderSalesDocumentHtml(contract), /<h2>เงื่อนไข<\/h2>.*เงื่อนไขเดิม/);
  const defaults = salesDocumentFormDefaults(contract);
  assert.equal(defaults.content.conditions, '<p>เงื่อนไขเดิม</p>');
  assert.equal(defaults.content.notes, '');
});

test('sales documents use their respective signer and recipient labels', () => {
  for (const [kind, signer, recipient] of [
    ['invoice', 'ลงชื่อผู้อนุมัติ', 'ลงชื่อผู้รับใบแจ้งหนี้'],
    ['billing_note', 'ลงชื่อผู้วางบิล', 'ลงชื่อผู้รับวางบิล'],
    ['receipt', 'ลงชื่อผู้รับเงิน', null],
  ]) {
    const form = { ...filledForm(), kind };
    form.content.details = 'รายละเอียดเพิ่มเติม';
    const html = renderSalesDocumentHtml(salesDocumentFormSchema.parse(form));
    assert.match(html, /<section class="sales-summary"/);
    assert.match(html, /รายละเอียดเพิ่มเติม/);
    assert.ok(html.includes(`<p>${signer}</p>`));
    assert.equal([...html.matchAll(/<div class="signature-slot">/g)].length, recipient ? 2 : 1);
    assert.ok(html.includes(`class="signatures ${recipient ? 'paired-signatures' : 'single-signature'}"`));
    if (recipient) {
      assert.ok(html.includes(`<p>${recipient}</p>`));
      assert.equal([...html.matchAll(/class="signature-date fillable"/g)].length, 2);
    }
  }
});

test('quote email sends the issued snapshot to the validated custom recipient', async () => {
  const form = filledForm();
  form.kind = 'quotation';
  form.content.customer.documentEmail = 'billing@example.com';
  const document = salesDocumentFormSchema.parse(form);
  const record = {
    status: 'issued',
    document_number: 'QU690001',
    issued_at: '2026-11-22T00:00:00Z',
    updated_at: '2026-11-22T00:00:00Z',
    content: document.content,
  };
  const sent = [];
  let caller = null;
  let queriedKind;
  const query = {
    select() { return this; },
    eq(column, value) { if (column === 'kind') queriedKind = value; return this; },
    async maybeSingle() { return { data: record, error: null }; },
  };
  const stubs = {
    'next/server': { NextResponse: { json: Response.json } },
    'src/lib/auth-token': { requireRole: () => caller },
    'src/lib/resend': { sendEmail: async (message) => sent.push(message) },
    'src/lib/sales-quotation-pdf': {
      renderSalesQuotationPdf: async ({ documentNumber, content }) => {
        assert.equal(documentNumber, record.document_number);
        assert.deepEqual(content, record.content);
        return Buffer.from('%PDF-1.7\nTest quotation');
      },
    },
    'src/lib/supabase-admin': { supabaseAdmin: { from: () => query } },
    'src/lib/branded-email-template': { renderBrandedEmail: ({ contentHtml }) => contentHtml },
  };
  const code = ts.transpileModule(readFileSync('src/app/api/master/sales-documents/send-email/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', code)((name) => {
    if (name in stubs) return stubs[name];
    if (name.startsWith('src/')) return load(resolve(`${name}.ts`));
    return require(name);
  }, exports);
  const send = (overrides = {}) => exports.POST(new Request('http://localhost/api/master/sales-documents/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: '605ace53-78bd-4fad-9411-dfc1f11fda72',
      revision: record.updated_at,
      recipient: 'finance@example.com',
      subject: 'ใบเสนอราคาตามที่คุยกัน',
      message: 'ส่งรายละเอียดให้ตรวจสอบ\n<script>test</script>',
      ...overrides,
    }),
  }));

  assert.equal((await send()).status, 403);
  caller = { role: 'master_admin' };
  assert.equal((await send({ recipient: 'invalid' })).status, 400);
  assert.equal((await send({ subject: ' ' })).status, 400);
  assert.equal((await send({ revision: '2026-11-20T00:00:00Z' })).status, 409);
  record.status = 'draft';
  assert.equal((await send()).status, 409);
  assert.equal(sent.length, 0);

  record.status = 'issued';
  assert.equal((await send()).status, 200);
  assert.equal(queriedKind, 'quotation');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'finance@example.com');
  assert.equal(sent[0].subject, 'ใบเสนอราคาตามที่คุยกัน');
  assert.match(sent[0].html, /ส่งรายละเอียดให้ตรวจสอบ<br>&lt;script&gt;test&lt;\/script&gt;/);
  assert.doesNotMatch(sent[0].html, /<script>/);
  assert.equal(sent[0].attachments[0].filename, 'QU690001.pdf');
  assert.match(sent[0].attachments[0].content.toString(), /^%PDF-/);
  const preview = await exports.GET(new Request(
    'http://localhost/api/master/sales-documents/send-email?' + new URLSearchParams({
      id: '605ace53-78bd-4fad-9411-dfc1f11fda72',
      revision: record.updated_at,
    })
  ));
  assert.equal(preview.headers.get('Content-Type'), 'application/pdf');
  assert.equal(preview.headers.get('Content-Disposition'), 'inline; filename="QU690001.pdf"');
  assert.deepEqual(Buffer.from(await preview.arrayBuffer()), sent[0].attachments[0].content);
});
